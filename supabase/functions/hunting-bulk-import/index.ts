import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportRequest {
  account_id: string;
  result_ids: string[];
  job_id?: string;
  stage_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Validate auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ImportRequest = await req.json();
    const { account_id, result_ids, job_id, stage_id } = body;

    if (!account_id || !result_ids?.length) {
      return new Response(
        JSON.stringify({ success: false, error: 'account_id e result_ids são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[hunting-import] Importing ${result_ids.length} candidates for account ${account_id}`);

    // Fetch the hunting results to import
    const { data: results, error: fetchError } = await supabase
      .from('recruitment_hunting_results')
      .select('*')
      .in('id', result_ids);

    if (fetchError || !results?.length) {
      return new Response(
        JSON.stringify({ success: false, error: 'Resultados não encontrados' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get job_id from search if not provided
    let targetJobId = job_id;
    let targetStageId = stage_id;

    if (!targetJobId && results[0]?.search_id) {
      const { data: search } = await supabase
        .from('recruitment_hunting_searches')
        .select('job_id')
        .eq('id', results[0].search_id)
        .single();
      
      targetJobId = search?.job_id;
    }

    // If we have a job but no stage, get the first stage
    if (targetJobId && !targetStageId) {
      const { data: stages } = await supabase
        .from('recruitment_stages')
        .select('id')
        .eq('job_id', targetJobId)
        .order('order_index', { ascending: true })
        .limit(1);
      
      targetStageId = stages?.[0]?.id;
    }

    const imported: string[] = [];
    const failed: string[] = [];

    for (const result of results) {
      try {
        const extractedData = result.extracted_data || {};
        
        // Extract name from different possible fields
        const fullName = extractedData.name || 
                    extractedData.title?.split(' at ')[0] || 
                    `Candidato Hunting`;
        
        // Split name into first_name and last_name (required fields)
        const nameParts = fullName.trim().split(/\s+/);
        const first_name = nameParts[0] || 'Candidato';
        const last_name = nameParts.slice(1).join(' ') || 'Hunting';
        
        // Generate email placeholder if not extracted (required field)
        const email = extractedData.email || 
                     extractedData.contact_email ||
                     `hunting.${result.id.slice(0, 8)}@pendente.gentia.app`;

        // Create candidate with first touch tracking
        const now = new Date().toISOString();
        const { data: candidate, error: candidateError } = await supabase
          .from('recruitment_candidates')
          .insert({
            account_id,
            first_name,
            last_name,
            email,
            phone: extractedData.phone || null,
            source: 'hunting',
            linkedin_url: result.source?.includes('linkedin') ? result.source_url : extractedData.linkedin_url,
            github_url: result.source?.includes('github') ? result.source_url : extractedData.github_url,
            notes: `Importado via Hunting em ${new Date().toLocaleDateString('pt-BR')}.\nPerfil original: ${result.source_url}`,
            // First touch tracking
            first_touch_source: 'hunting',
            first_touch_medium: 'outbound',
            first_touch_campaign: `hunting_import_${results[0]?.search_id || 'direct'}`,
            first_touch_at: now,
            last_touch_source: 'hunting',
            last_touch_medium: 'outbound',
            last_touch_at: now,
          })
          .select()
          .single();

        if (candidateError) {
          console.error(`[hunting-import] Error creating candidate:`, candidateError);
          failed.push(result.id);
          continue;
        }

        // Register tracking event
        await supabase.from("candidate_tracking_events").insert([{
          account_id,
          candidate_id: candidate.id,
          job_id: targetJobId || null,
          event_type: "submitted_application",
          source: "hunting",
          medium: "outbound",
          campaign: `hunting_import_${results[0]?.search_id || 'direct'}`,
          metadata: {
            search_id: result.search_id,
            source_url: result.source_url,
            source_platform: result.source,
          },
        }]);

        // Create application if we have a job
        if (targetJobId && candidate) {
          const { error: appError } = await supabase
            .from('recruitment_applications')
            .insert({
              candidate_id: candidate.id,
              job_id: targetJobId,
              stage_id: targetStageId,
              status: 'new',
              source: 'hunting',
              medium: 'outbound',
              campaign: `hunting_import_${results[0]?.search_id || 'direct'}`,
              applied_at: new Date().toISOString(),
            });

          if (appError) {
            console.warn(`[hunting-import] Error creating application:`, appError);
          }
        }

        // Update hunting result to mark as imported
        await supabase
          .from('recruitment_hunting_results')
          .update({
            imported_as_candidate_id: candidate.id,
            status: 'imported',
          })
          .eq('id', result.id);

        imported.push(result.id);
        console.log(`[hunting-import] Successfully imported: ${first_name} ${last_name}`);

      } catch (error) {
        console.error(`[hunting-import] Error importing result ${result.id}:`, error);
        failed.push(result.id);
      }
    }

    console.log(`[hunting-import] Import complete. Success: ${imported.length}, Failed: ${failed.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        imported_count: imported.length,
        failed_count: failed.length,
        imported_ids: imported,
        failed_ids: failed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[hunting-import] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
