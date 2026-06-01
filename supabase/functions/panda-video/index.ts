import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PANDA_API_BASE = 'https://api-v2.pandavideo.com.br'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: isAdmin } = await supabase.rpc('is_super_admin', { _user_id: user.id })
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Acesso negado' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const pandaApiKey = Deno.env.get('PANDA_VIDEO_API_KEY')
  if (!pandaApiKey) {
    return new Response(JSON.stringify({ error: 'API Key do Panda Video não configurada' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const url = new URL(req.url)
  const search = url.searchParams.get('search') || ''
  const page = url.searchParams.get('page') || '1'

  try {
    const pandaUrl = new URL(`${PANDA_API_BASE}/videos`)
    pandaUrl.searchParams.set('page', page)
    pandaUrl.searchParams.set('limit', '20')
    if (search) {
      pandaUrl.searchParams.set('title', search)
    }

    const response = await fetch(pandaUrl.toString(), {
      headers: {
        'Authorization': pandaApiKey,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Panda API error:', response.status, errorText)
      return new Response(JSON.stringify({ error: `Erro na API Panda: ${response.status}` }), {
        status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Error calling Panda API:', err)
    return new Response(JSON.stringify({ error: 'Erro ao conectar com Panda Video' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
