import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log('[evaboot-webhook] Received payload:', JSON.stringify(payload).substring(0, 500));

    // Evaboot sends extraction results with job_id/extraction_id and candidates array
    const evabootJobId = payload.id || payload.job_id || payload.extraction_id;
    const candidates = payload.results || payload.data || payload.leads || [];

    if (!evabootJobId) {
      console.error('[evaboot-webhook] No job_id in payload');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing job_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the hunting search by evaboot_job_id
    const { data: searchRecord, error: searchErr } = await supabase
      .from('recruitment_hunting_searches')
      .select('*')
      .eq('evaboot_job_id', String(evabootJobId))
      .single();

    if (searchErr || !searchRecord) {
      console.error('[evaboot-webhook] Search not found for evaboot_job_id:', evabootJobId);
      return new Response(
        JSON.stringify({ success: false, error: 'Search not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchId = searchRecord.id;
    console.log(`[evaboot-webhook] Processing ${candidates.length} candidates for search ${searchId}`);

    let newCount = 0;
    let duplicateCount = 0;

    for (const candidate of candidates) {
      // Extract LinkedIn URL - Evaboot may use different field names
      const linkedinUrl = candidate.linkedin_url || candidate.linkedinUrl || candidate.profile_url || candidate.url;
      if (!linkedinUrl || !linkedinUrl.includes('linkedin.com')) {
        continue;
      }

      // Dedup by source_url
      const { data: existing } = await supabase
        .from('recruitment_hunting_results')
        .select('id')
        .eq('search_id', searchId)
        .eq('source_url', linkedinUrl)
        .maybeSingle();

      if (existing) {
        duplicateCount++;
        continue;
      }

      // Extract candidate data from Evaboot format
      const name = candidate.full_name || candidate.name || `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim();
      const title = candidate.job_title || candidate.title || candidate.headline || '';
      const company = candidate.company_name || candidate.company || candidate.current_company || '';
      const location = candidate.location || candidate.city || '';
      const email = candidate.email || candidate.professional_email || '';
      const phone = candidate.phone || candidate.phone_number || '';

      // Insert into hunting results
      const { error: insertErr } = await supabase
        .from('recruitment_hunting_results')
        .insert({
          search_id: searchId,
          source: 'linkedin',
          source_url: linkedinUrl,
          extracted_data: {
            name,
            title: `${name} - ${title} at ${company}`,
            company,
            location,
            email,
            phone,
            evaboot_source: true,
            apollo_data: {
              name,
              title,
              organization_name: company,
              email: email || null,
              phone: phone || null,
              linkedin_url: linkedinUrl,
            },
          },
          status: 'pending',
          score_source: 'pending',
          qualified: false,
        });

      if (insertErr) {
        console.error('[evaboot-webhook] Insert error:', insertErr);
        continue;
      }

      newCount++;

      // Trigger scrape-profile for enrichment (fire and forget)
      try {
        const { data: resultRecord } = await supabase
          .from('recruitment_hunting_results')
          .select('id')
          .eq('search_id', searchId)
          .eq('source_url', linkedinUrl)
          .single();

        if (resultRecord) {
          fetch(`${supabaseUrl}/functions/v1/hunting-scrape-profile`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
              'apikey': Deno.env.get('SUPABASE_ANON_KEY') || '',
            },
            body: JSON.stringify({
              result_id: resultRecord.id,
              url: linkedinUrl,
            }),
          }).catch(err => console.error('[evaboot-webhook] Scrape trigger error:', err));
        }
      } catch {
        // best effort
      }
    }

    // Update search record
    const currentResultsCount = searchRecord.results_count || 0;
    await supabase
      .from('recruitment_hunting_searches')
      .update({
        evaboot_status: 'completed',
        results_count: currentResultsCount + newCount,
      } as any)
      .eq('id', searchId);

    console.log(`[evaboot-webhook] Done: ${newCount} new, ${duplicateCount} duplicates`);

    return new Response(
      JSON.stringify({ success: true, new_candidates: newCount, duplicates: duplicateCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[evaboot-webhook] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
