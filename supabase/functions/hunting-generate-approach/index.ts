import { createClient } from 'npm:@supabase/supabase-js@2';
import { getConfiguredModel } from '../_shared/ai-model-config.ts';
import { consumeAICredits } from '../_shared/ai-credit-consumption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateApproachRequest {
  hunting_result_id: string;
  account_id: string;
  persona_id?: string;
}

const WHATSAPP_SYSTEM_PROMPT = `Você é um recrutador tech experiente e empático.
Gere uma mensagem de abordagem para WhatsApp (máximo 280 caracteres).

REGRAS OBRIGATÓRIAS:
1. Personalize com dados reais do perfil (nome, skills, empresa atual)
2. Mencione algo específico do trabalho ou experiência do candidato
3. Apresente a oportunidade de forma atrativa sem revelar salário
4. Use tom conversacional e amigável, NÃO robótico ou corporativo
5. Inclua CTA claro no final (ex: "posso te contar mais?", "te interessa?")
6. NÃO use emojis em excesso (máximo 1-2)
7. NÃO seja genérico - a mensagem deve ser claramente personalizada
8. Comece com "Oi" ou "Olá", NUNCA com "Prezado" ou formalidades

EXEMPLO BOM:
"Oi João! Vi seu trabalho com React no Nubank, muito legal o projeto de micro-frontends. Temos uma vaga de Senior Frontend aqui na TechCo que combina demais com seu perfil. Posso te contar mais?"

EXEMPLO RUIM:
"Prezado candidato, identificamos seu perfil como adequado para nossa vaga. Entre em contato para mais informações."`;

const EMAIL_SYSTEM_PROMPT = `Você é um recrutador tech experiente e empático.
Gere uma mensagem de abordagem para EMAIL profissional.

A resposta DEVE ser em formato JSON com dois campos:
{"subject": "Assunto do email", "body": "Corpo da mensagem"}

REGRAS OBRIGATÓRIAS:
1. O subject deve ser curto, atrativo e personalizado (máximo 60 caracteres)
2. O body deve ter entre 150-400 caracteres
3. Personalize com dados reais do perfil (nome, skills, empresa atual)
4. Mencione algo específico do trabalho ou experiência do candidato
5. Apresente a oportunidade de forma atrativa sem revelar salário
6. Use tom profissional mas acolhedor — mais formal que WhatsApp, mas não burocrático
7. Inclua CTA claro no final
8. NÃO seja genérico - a mensagem deve ser claramente personalizada
9. Comece com "Olá" + nome, NUNCA com "Prezado(a) Senhor(a)"

EXEMPLO BOM:
{"subject": "Oportunidade Senior Frontend — TechCo", "body": "Olá João,\\n\\nConheci seu trabalho com React no Nubank e fiquei impressionado com o projeto de micro-frontends que você liderou.\\n\\nAqui na TechCo, estamos montando um time de Frontend com desafios similares e acredito que seu perfil é exatamente o que buscamos.\\n\\nPosso te contar mais sobre a vaga? Seria ótimo trocar uma ideia.\\n\\nAbraço"}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      console.error('[hunting-generate-approach] LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const body: GenerateApproachRequest = await req.json();
    const { hunting_result_id, account_id, persona_id } = body;

    if (!hunting_result_id || !account_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'hunting_result_id e account_id são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[hunting-generate-approach] Generating for result ${hunting_result_id}`);

    // Fetch hunting result with search info
    const { data: huntingResult, error: resultError } = await supabase
      .from('recruitment_hunting_results')
      .select(`
        *,
        search:recruitment_hunting_searches(
          job_id,
          icp_id,
          query
        )
      `)
      .eq('id', hunting_result_id)
      .single();

    if (resultError || !huntingResult) {
      console.error('[hunting-generate-approach] Result not found:', resultError);
      return new Response(
        JSON.stringify({ success: false, error: 'Resultado de hunting não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch ICP if available
    let icp = null;
    const icpId = huntingResult.search?.icp_id;
    
    if (icpId) {
      const { data: icpData } = await supabase
        .from('job_icps')
        .select('*')
        .eq('id', icpId)
        .single();
      
      icp = icpData;
    }

    // Fetch job info if available
    let job = null;
    const jobId = huntingResult.search?.job_id;
    
    if (jobId) {
      const { data: jobData } = await supabase
        .from('recruitment_jobs')
        .select('title, department, location, employment_type, work_model')
        .eq('id', jobId)
        .single();
      
      job = jobData;
    }

    // Fetch company info
    const { data: company } = await supabase
      .from('companies')
      .select('name, sector')
      .eq('id', account_id)
      .single();

    // Fetch persona if provided
    let persona: { name: string; tone: string | null; style_guidelines: string | null; example_messages: any } | null = null;
    if (persona_id) {
      const { data: personaData } = await supabase
        .from('hunting_outreach_personas')
        .select('name, tone, style_guidelines, example_messages')
        .eq('id', persona_id)
        .eq('account_id', account_id)
        .single();
      persona = personaData;
    }

    // Build context for AI
    const profileData = huntingResult.extracted_data || {};
    const candidateName = profileData.name || profileData.title?.split(' at ')[0] || 'candidato';
    
    let personaContext = '';
    if (persona) {
      personaContext = `\nPERSONA DE ABORDAGEM:
- Nome da persona: ${persona.name}
- Tom: ${persona.tone || 'Padrão'}
- Diretrizes de estilo: ${persona.style_guidelines || 'Nenhuma'}`;
      if (persona.example_messages && Array.isArray(persona.example_messages) && persona.example_messages.length > 0) {
        personaContext += `\n- Exemplos de referência: ${persona.example_messages.slice(0, 2).join(' | ')}`;
      }
      personaContext += '\n\nIMPORTANTE: Siga o tom e estilo da persona acima ao gerar a mensagem.\n';
    }

    // Build posts context (LinkedIn + Instagram)
    let postsContext = '';
    const posts = profileData.posts || [];
    const instagramPosts = profileData.instagram_data?.posts || [];
    const allPosts = [...posts, ...instagramPosts];
    
    if (allPosts.length > 0) {
      const recentPosts = allPosts
        .filter((p: any) => (p.text || p.caption || '').length > 15)
        .slice(0, 5)
        .map((p: any, i: number) => {
          const text = (p.text || p.caption || '').substring(0, 150);
          const src = p.source === 'instagram' ? '(Instagram)' : '(LinkedIn)';
          return `  ${i + 1}. ${src} "${text}"`;
        })
        .join('\n');
      
      if (recentPosts) {
        postsContext = `\nPOSTAGENS RECENTES DO CANDIDATO (use como contexto para personalizar):\n${recentPosts}\n`;
      }
    }

    // Build DISC / behavioral context
    let discContext = '';
    const disc = profileData.inferred_disc;
    const commStyle = profileData.communication_style;
    
    if (disc) {
      const toneMap: Record<string, string> = {
        'D': 'direto e objetivo — vá ao ponto, destaque desafios e resultados',
        'I': 'entusiasmado e relacional — seja caloroso, mencione cultura e networking',
        'S': 'calmo e seguro — transmita estabilidade, mencione equipe e suporte',
        'C': 'técnico e preciso — use dados, seja específico sobre stack e impacto',
      };
      const primaryTone = toneMap[disc.primary] || 'equilibrado';
      
      discContext = `\nPERFIL COMPORTAMENTAL (DISC inferido):
- Perfil primário: ${disc.primary} (${disc.d}D/${disc.i}I/${disc.s}S/${disc.c}C)
- Estilo de comunicação: ${commStyle || 'balanced'}
- TOM RECOMENDADO: ${primaryTone}
- ADAPTE sua mensagem ao perfil comportamental acima.\n`;
    }

    // Instagram insights
    let igContext = '';
    if (profileData.instagram_data) {
      const ig = profileData.instagram_data;
      igContext = `\nINSTAGRAM (@${ig.username}):
- Bio: ${ig.bio?.substring(0, 150) || 'N/A'}
- Seguidores: ${ig.followers || 'N/A'}
- Verificado: ${ig.is_verified ? 'Sim' : 'Não'}\n`;
    }

    const contextPrompt = `
DADOS DO CANDIDATO:
- Nome: ${candidateName}
- Cargo atual: ${profileData.title || 'Não informado'}
- Empresa atual: ${profileData.company || 'Não informado'}
- Localização: ${profileData.location || 'Não informado'}
- Skills: ${(profileData.skills || []).slice(0, 6).join(', ') || 'Não informado'}
- Resumo: ${profileData.summary?.substring(0, 300) || profileData.bio?.substring(0, 300) || 'Não disponível'}
- Fonte: ${huntingResult.source} (${huntingResult.source_url})
${igContext}
${postsContext}
${discContext}
DADOS DA VAGA:
- Cargo: ${job?.title || icp?.role || 'Vaga Tech'}
- Senioridade: ${icp?.seniority || 'Não especificado'}
- Departamento: ${job?.department || 'Tecnologia'}
- Modelo: ${job?.work_model || icp?.work_context || 'Flexível'}
- Localização: ${job?.location || 'Brasil'}

DADOS DA EMPRESA:
- Nome: ${company?.name || 'Nossa empresa'}
- Setor: ${company?.sector || 'Tecnologia'}

MATCH SCORE: ${huntingResult.match_score || 'N/A'}%
${personaContext}
Gere a mensagem de abordagem personalizada:`;

    // Determine channel: whatsapp if phone available, email if only email
    const phoneNumber = profileData.phone || profileData.whatsapp || null;
    const emailAddress = profileData.email || null;
    const channel = phoneNumber ? 'whatsapp' : (emailAddress ? 'email' : 'whatsapp');
    const systemPrompt = channel === 'email' ? EMAIL_SYSTEM_PROMPT : WHATSAPP_SYSTEM_PROMPT;

    console.log(`[hunting-generate-approach] Calling AI for channel: ${channel}`);

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: await getConfiguredModel("hunting-generate-approach", "google/gemini-2.5-flash"),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: contextPrompt },
        ],
        temperature: 0.7,
        max_tokens: channel === 'email' ? 400 : 200,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[hunting-generate-approach] AI error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Limite de IA atingido. Tente novamente mais tarde.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao gerar mensagem com IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const rawAiContent = aiData.choices?.[0]?.message?.content?.trim();

    // Consume AI credits
    await consumeAICredits({
      supabase,
      accountId: account_id,
      aiData,
      model: 'google/gemini-2.5-flash',
      referenceId: hunting_result_id,
      referenceType: 'hunting_approach',
      description: `Mensagem de abordagem (${channel}) para ${candidateName}`,
      userId: user.id,
    });

    if (!rawAiContent) {
      console.error('[hunting-generate-approach] Empty AI response');
      return new Response(
        JSON.stringify({ success: false, error: 'IA retornou mensagem vazia' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse response based on channel
    let generatedMessage = rawAiContent;
    let emailSubject: string | null = null;

    if (channel === 'email') {
      try {
        // Try to parse JSON response for email
        const cleanJson = rawAiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        emailSubject = parsed.subject || `Oportunidade — ${company?.name || 'Recrutamento'}`;
        generatedMessage = parsed.body || rawAiContent;
      } catch {
        // If JSON parse fails, use raw content as body
        emailSubject = `Oportunidade — ${company?.name || 'Recrutamento'}`;
        generatedMessage = rawAiContent;
      }
    }

    console.log(`[hunting-generate-approach] Generated (${channel}): "${generatedMessage.substring(0, 50)}..."`);

    // Save approach to database
    const { data: approach, error: insertError } = await supabase
      .from('recruitment_hunting_approaches')
      .insert({
        hunting_result_id,
        account_id,
        icp_id: icpId || null,
        message_generated: generatedMessage,
        phone_number: phoneNumber,
        generation_model: 'google/gemini-2.5-flash',
        created_by: user.id,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[hunting-generate-approach] Error saving approach:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao salvar abordagem' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        approach: {
          id: approach.id,
          message: generatedMessage,
          phone_number: phoneNumber,
          email: emailAddress,
          email_subject: emailSubject,
          candidate_name: candidateName,
          channel,
          status: 'pending',
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[hunting-generate-approach] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
