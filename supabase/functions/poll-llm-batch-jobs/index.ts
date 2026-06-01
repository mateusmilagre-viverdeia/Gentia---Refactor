import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const openaiKey = Deno.env.get('OPENAI_API_KEY');

  const started = Date.now();
  const result = { polled: 0, completed: 0, failed: 0, still_running: 0, errors: [] as string[] };

  try {
    const { data: jobs, error } = await supabase
      .from('llm_batch_jobs')
      .select('id, account_id, provider, provider_batch_id, status, input_payload')
      .in('status', ['submitted', 'in_progress'])
      .limit(50);

    if (error) throw error;
    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ ...result, duration_ms: Date.now() - started }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    for (const job of jobs) {
      result.polled++;
      try {
        if (job.provider !== 'openai' || !openaiKey) {
          result.errors.push(`job ${job.id}: provider not supported or missing key`);
          continue;
        }

        const res = await fetch(`https://api.openai.com/v1/batches/${job.provider_batch_id}`, {
          headers: { Authorization: `Bearer ${openaiKey}` },
        });
        if (!res.ok) {
          result.errors.push(`job ${job.id}: openai ${res.status}`);
          continue;
        }
        const batch = await res.json();
        const status = batch.status as string;

        if (status === 'completed') {
          let output: unknown = null;
          if (batch.output_file_id) {
            const fileRes = await fetch(`https://api.openai.com/v1/files/${batch.output_file_id}/content`, {
              headers: { Authorization: `Bearer ${openaiKey}` },
            });
            const text = await fileRes.text();
            output = text.split('\n').filter(Boolean).map((l) => {
              try { return JSON.parse(l); } catch { return { raw: l }; }
            });
          }
          await supabase.from('llm_batch_jobs').update({
            status: 'completed',
            result_payload: output,
            completed_at: new Date().toISOString(),
          }).eq('id', job.id);
          result.completed++;
        } else if (status === 'failed' || status === 'expired' || status === 'cancelled') {
          await supabase.from('llm_batch_jobs').update({
            status: 'failed',
            error_message: `OpenAI batch ${status}`,
            completed_at: new Date().toISOString(),
          }).eq('id', job.id);
          result.failed++;
        } else {
          if (job.status !== 'in_progress' && status === 'in_progress') {
            await supabase.from('llm_batch_jobs').update({ status: 'in_progress' }).eq('id', job.id);
          }
          result.still_running++;
        }
      } catch (e) {
        result.errors.push(`job ${job.id}: ${(e as Error).message}`);
      }
    }

    return new Response(JSON.stringify({ ...result, duration_ms: Date.now() - started }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
