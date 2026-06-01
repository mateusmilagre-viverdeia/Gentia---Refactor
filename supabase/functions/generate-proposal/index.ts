import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateProposalRequest {
  application_id: string;
  template_id: string;
  account_id: string;
  salary_offered: number;
  currency?: string;
  start_date: string;
  benefits?: Array<{ name: string; value?: string; description?: string }>;
  custom_clauses?: string[];
  additional_notes?: string;
  valid_until?: string;
  hiring_manager_name?: string;
}

interface TemplateVariable {
  name: string;
  label: string;
  required: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestData: GenerateProposalRequest = await req.json();
    const {
      application_id,
      template_id,
      account_id,
      salary_offered,
      currency = 'BRL',
      start_date,
      benefits = [],
      custom_clauses = [],
      additional_notes,
      valid_until,
      hiring_manager_name,
    } = requestData;

    if (!application_id || !template_id || !account_id || !salary_offered || !start_date) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Generating proposal for application ${application_id}`);

    // Fetch template
    const { data: template, error: templateError } = await supabaseClient
      .from('recruitment_proposal_templates')
      .select('*')
      .eq('id', template_id)
      .single();

    if (templateError || !template) {
      throw new Error('Template not found');
    }

    // Fetch application with candidate and job details
    const { data: application, error: appError } = await supabaseClient
      .from('recruitment_applications')
      .select(`
        id,
        recruitment_candidates (
          id,
          name,
          email
        ),
        recruitment_jobs (
          id,
          title,
          department,
          location,
          employment_type
        )
      `)
      .eq('id', application_id)
      .single();

    if (appError || !application) {
      throw new Error('Application not found');
    }

    // Fetch company details
    const { data: company, error: companyError } = await supabaseClient
      .from('companies')
      .select('name, current_mission')
      .eq('id', account_id)
      .single();

    if (companyError || !company) {
      throw new Error('Company not found');
    }

    // Build variables for template
    // Handle both array and single object responses
    const candidateData = Array.isArray(application.recruitment_candidates) 
      ? application.recruitment_candidates[0] 
      : application.recruitment_candidates;
    const jobData = Array.isArray(application.recruitment_jobs) 
      ? application.recruitment_jobs[0] 
      : application.recruitment_jobs;
    
    const candidateName = candidateData?.name || 'Candidato';
    const candidateFirstName = candidateName.split(' ')[0];

    const formatCurrency = (value: number, curr: string) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: curr,
      }).format(value);
    };

    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    };

    const formatBenefits = (benefitsList: typeof benefits) => {
      if (!benefitsList || benefitsList.length === 0) {
        return 'A definir conforme política da empresa.';
      }
      return benefitsList.map(b => {
        if (b.value) {
          return `- **${b.name}:** ${b.value}${b.description ? ` - ${b.description}` : ''}`;
        }
        return `- **${b.name}**${b.description ? `: ${b.description}` : ''}`;
      }).join('\n');
    };

    const employmentTypeLabels: Record<string, string> = {
      full_time: 'CLT Integral',
      part_time: 'CLT Parcial',
      contract: 'Contrato PJ',
      internship: 'Estágio',
      temporary: 'Temporário',
    };

    const variables: Record<string, string> = {
      candidateName,
      candidateFirstName,
      candidateEmail: candidateData?.email || '',
      jobTitle: jobData?.title || 'Posição',
      department: jobData?.department || 'A definir',
      location: jobData?.location || 'A definir',
      employmentType: employmentTypeLabels[jobData?.employment_type || ''] || jobData?.employment_type || 'CLT',
      salary: formatCurrency(salary_offered, currency),
      currency,
      startDate: formatDate(start_date),
      benefits: formatBenefits(benefits),
      validUntil: valid_until ? formatDate(valid_until) : formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
      companyName: company.name,
      companyMission: company.current_mission || 'nossos objetivos',
      hiringManagerName: hiring_manager_name || 'Equipe de RH',
    };

    // Replace variables in template
    let generatedContent = template.content;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      generatedContent = generatedContent.replace(regex, value);
    }

    // Add custom clauses if any
    if (custom_clauses && custom_clauses.length > 0) {
      generatedContent += '\n\n## Cláusulas Adicionais\n\n';
      custom_clauses.forEach((clause, index) => {
        generatedContent += `${index + 1}. ${clause}\n`;
      });
    }

    // Add additional notes if any
    if (additional_notes) {
      generatedContent += `\n\n## Observações\n\n${additional_notes}`;
    }

    // Use AI to enhance/personalize the proposal
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (LOVABLE_API_KEY) {
      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `Você é um especialista em RH que revisa e melhora cartas de oferta de emprego.
                
Sua tarefa é:
1. Manter todas as informações factuais (salário, data, benefícios) EXATAMENTE como estão
2. Melhorar a fluência e tom profissional do texto
3. Adicionar toques de personalização e acolhimento
4. Corrigir quaisquer erros gramaticais
5. Manter o formato Markdown

IMPORTANTE: Não altere valores, datas ou nomes. Apenas melhore a redação.
Retorne APENAS o texto melhorado, sem comentários adicionais.`
              },
              {
                role: 'user',
                content: `Melhore esta carta de oferta mantendo todas as informações:\n\n${generatedContent}`
              }
            ],
            max_tokens: 2000,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const enhancedContent = aiData.choices?.[0]?.message?.content;
          if (enhancedContent) {
            generatedContent = enhancedContent;
            console.log('Proposal enhanced by AI');
          }
        } else {
          console.warn('AI enhancement failed, using original content');
        }
      } catch (aiError) {
        console.warn('AI enhancement error:', aiError);
        // Continue with non-enhanced content
      }
    }

    // Save the proposal
    const { data: proposal, error: proposalError } = await supabaseClient
      .from('recruitment_proposals')
      .insert({
        account_id,
        application_id,
        template_id,
        salary_offered,
        currency,
        start_date,
        benefits,
        custom_clauses,
        additional_notes,
        generated_content: generatedContent,
        final_content: generatedContent,
        status: 'draft',
        valid_until: valid_until || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        generated_by: user.id,
        metadata: {
          variables_used: Object.keys(variables),
          template_name: template.name,
          ai_enhanced: !!LOVABLE_API_KEY,
        },
      })
      .select()
      .single();

    if (proposalError) {
      console.error('Error saving proposal:', proposalError);
      throw new Error(`Failed to save proposal: ${proposalError.message}`);
    }

    console.log(`Proposal ${proposal.id} created successfully`);

    return new Response(JSON.stringify({
      success: true,
      proposal,
      message: 'Proposta gerada com sucesso',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-proposal:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
