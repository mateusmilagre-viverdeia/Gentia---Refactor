import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { result_id } = await req.json();

    if (!result_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'result_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch result
    const { data: result, error } = await supabase
      .from('recruitment_hunting_results')
      .select('id, source_url, extracted_data')
      .eq('id', result_id)
      .single();

    if (error || !result) {
      return new Response(
        JSON.stringify({ success: false, error: 'Result not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const extractedData = result.extracted_data || {};
    const enrichments: any = {};

    // 1. Try Apollo Match first
    const apolloApiKey = Deno.env.get('APOLLO_API_KEY');
    if (apolloApiKey && !extractedData.apollo_enrichment) {
      try {
        const body: any = {};
        if (result.source_url) body.linkedin_url = result.source_url;
        else {
          if (extractedData.name) body.name = extractedData.name;
          if (extractedData.company) body.organization_name = extractedData.company;
        }

        const response = await fetch('https://api.apollo.io/v1/people/match', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': apolloApiKey,
          },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.person) {
            enrichments.apollo_enrichment = {
              email: data.person.email,
              phone: data.person.phone_numbers?.[0]?.sanitized_number || null,
              seniority: data.person.seniority,
              title: data.person.title,
              company: data.person.organization?.name,
              linkedin_url: data.person.linkedin_url,
              enriched_at: new Date().toISOString(),
            };
          }
        }
      } catch (err) {
        console.error('[clay-enrich] Apollo error:', err);
      }
    }

    // 2. Try Clay if configured (waterfall enrichment)
    const clayApiKey = Deno.env.get('CLAY_API_KEY');
    if (clayApiKey) {
      try {
        // Clay webhook-based enrichment
        const clayWebhookUrl = Deno.env.get('CLAY_WEBHOOK_URL');
        if (clayWebhookUrl) {
          const clayResponse = await fetch(clayWebhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${clayApiKey}`,
            },
            body: JSON.stringify({
              name: extractedData.name,
              linkedin_url: result.source_url,
              company: extractedData.company,
              title: extractedData.title,
            }),
          });

          if (clayResponse.ok) {
            const clayData = await clayResponse.json();
            enrichments.clay_enrichment = {
              ...clayData,
              enriched_at: new Date().toISOString(),
            };
          }
        }
      } catch (err) {
        console.error('[clay-enrich] Clay error:', err);
      }
    }

    // Update result with enrichments
    if (Object.keys(enrichments).length > 0) {
      const updatedData = { ...extractedData, ...enrichments };
      await supabase
        .from('recruitment_hunting_results')
        .update({ extracted_data: updatedData })
        .eq('id', result_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        enriched: Object.keys(enrichments).length > 0,
        sources: Object.keys(enrichments),
        data: enrichments,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[clay-enrich] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
