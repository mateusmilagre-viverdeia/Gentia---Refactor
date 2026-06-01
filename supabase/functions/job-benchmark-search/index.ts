import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getConfiguredModel } from '../_shared/ai-model-config.ts';
import { consumeAICredits, accumulateUsage } from '../_shared/ai-credit-consumption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BenchmarkRequest {
  type: 'job_description' | 'employer_branding' | 'competitor_analysis';
  jobTitle: string;
  industry?: string;
  competitors?: string[];
  location?: string;
  accountId?: string;
}

interface JobReference {
  source: string;
  url: string;
  title: string;
  company?: string;
  highlights: {
    responsibilities?: string[];
    requirements?: string[];
    benefits?: string[];
    salary_range?: string;
    culture_points?: string[];
  };
}

interface BenchmarkResponse {
  success: boolean;
  references: JobReference[];
  insights: {
    common_requirements: string[];
    differentiators: string[];
    market_benefits: string[];
    suggested_improvements: string[];
  };
  cached: boolean;
  error?: string;
}

// Normalize job title for caching
function normalizeJobTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

// Track accumulated token usage across calls
let _accumulatedUsage = { prompt_tokens: 0, completion_tokens: 0 };

// Extract structured data from markdown using LLM
async function extractJobData(markdown: string, url: string): Promise<JobReference | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return null;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: await getConfiguredModel("job-benchmark-search", "google/gemini-2.5-flash"),
        messages: [
          {
            role: "system",
            content: `Você é um extrator de dados de vagas de emprego. Analise o texto de uma vaga e extraia informações estruturadas.
            
Retorne um JSON válido com a estrutura:
{
  "title": "string - título da vaga",
  "company": "string - nome da empresa",
  "responsibilities": ["array de principais responsabilidades"],
  "requirements": ["array de requisitos técnicos"],
  "benefits": ["array de benefícios oferecidos"],
  "salary_range": "string ou null - faixa salarial se mencionada",
  "culture_points": ["array de pontos sobre cultura se mencionados"]
}

Se uma informação não estiver disponível, use array vazio ou null.`
          },
          {
            role: "user",
            content: `Extraia as informações desta vaga:\n\n${markdown.substring(0, 4000)}`
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.error("LLM extraction failed:", response.status);
      return null;
    }

    const data = await response.json();
    _accumulatedUsage = accumulateUsage(_accumulatedUsage, data);
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    
    const extracted = JSON.parse(jsonMatch[0]);
    
    return {
      source: new URL(url).hostname.replace('www.', ''),
      url,
      title: extracted.title || 'Vaga sem título',
      company: extracted.company,
      highlights: {
        responsibilities: extracted.responsibilities || [],
        requirements: extracted.requirements || [],
        benefits: extracted.benefits || [],
        salary_range: extracted.salary_range,
        culture_points: extracted.culture_points || [],
      },
    };
  } catch (error) {
    console.error("Error extracting job data:", error);
    return null;
  }
}

// Generate insights from references using LLM
async function generateInsights(references: JobReference[], jobTitle: string): Promise<BenchmarkResponse['insights']> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY || references.length === 0) {
    return {
      common_requirements: [],
      differentiators: [],
      market_benefits: [],
      suggested_improvements: [],
    };
  }

  try {
    const refsText = references.map((r, i) => 
      `Referência ${i + 1} (${r.source}):
- Requisitos: ${r.highlights.requirements?.join(', ') || 'N/A'}
- Benefícios: ${r.highlights.benefits?.join(', ') || 'N/A'}
- Cultura: ${r.highlights.culture_points?.join(', ') || 'N/A'}`
    ).join('\n\n');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: await getConfiguredModel("job-benchmark-search", "google/gemini-2.5-flash"),
        messages: [
          {
            role: "system",
            content: `Você é um analista de mercado de trabalho. Analise referências de vagas similares e gere insights acionáveis.

Retorne um JSON válido com:
{
  "common_requirements": ["5-7 requisitos que aparecem em múltiplas vagas"],
  "differentiators": ["3-5 diferenciais que poucas vagas oferecem mas são atrativos"],
  "market_benefits": ["5-7 benefícios mais comuns no mercado"],
  "suggested_improvements": ["3-5 sugestões específicas para tornar a vaga mais competitiva"]
}

Foque em padrões de mercado e oportunidades de diferenciação.`
          },
          {
            role: "user",
            content: `Analise estas referências de vagas para "${jobTitle}":\n\n${refsText}`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error("LLM insights failed:", response.status);
      return {
        common_requirements: [],
        differentiators: [],
        market_benefits: [],
        suggested_improvements: [],
      };
    }

    const data = await response.json();
    _accumulatedUsage = accumulateUsage(_accumulatedUsage, data);
    const content = data.choices?.[0]?.message?.content || '';
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Error generating insights:", error);
    return {
      common_requirements: [],
      differentiators: [],
      market_benefits: [],
      suggested_improvements: [],
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Reset accumulated usage for this request
    _accumulatedUsage = { prompt_tokens: 0, completion_tokens: 0 };

    const body: BenchmarkRequest = await req.json();
    const { type, jobTitle, industry, location, accountId } = body;

    if (!jobTitle) {
      return new Response(
        JSON.stringify({ success: false, error: 'Job title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const normalizedTitle = normalizeJobTitle(jobTitle);
    console.log(`Benchmark search for: "${jobTitle}" (normalized: ${normalizedTitle})`);

    // Check cache first
    const { data: cached } = await supabase
      .from('job_benchmark_cache')
      .select('*')
      .eq('job_title_normalized', normalizedTitle)
      .eq('industry', industry || 'general')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cached) {
      console.log('Returning cached benchmark');
      return new Response(
        JSON.stringify({
          success: true,
          ...cached.benchmark_data,
          cached: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build search query for job boards
    const searchQuery = `"${jobTitle}" vaga ${location || 'Brasil'} site:gupy.io OR site:vagas.com.br OR site:99jobs.com OR site:catho.com.br`;
    
    console.log('Searching with query:', searchQuery);

    // Firecrawl search
    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 5,
        lang: 'pt-BR',
        country: 'BR',
        scrapeOptions: {
          formats: ['markdown'],
          onlyMainContent: true,
        },
      }),
    });

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      console.error('Firecrawl search error:', errorData);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to search job boards' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchData = await searchResponse.json();
    const results = searchData.data || [];
    
    console.log(`Found ${results.length} search results`);

    // Extract structured data from each result
    const references: JobReference[] = [];
    
    for (const result of results.slice(0, 5)) {
      if (result.markdown) {
        const extracted = await extractJobData(result.markdown, result.url || result.sourceURL || '');
        if (extracted) {
          references.push(extracted);
        }
      }
    }

    console.log(`Extracted ${references.length} job references`);

    // Generate insights
    const insights = await generateInsights(references, jobTitle);

    // Consume credits for all accumulated AI calls
    if (accountId && (_accumulatedUsage.prompt_tokens > 0 || _accumulatedUsage.completion_tokens > 0)) {
      const modelUsed = await getConfiguredModel("job-benchmark-search", "google/gemini-2.5-flash");
      await consumeAICredits({
        supabase,
        accountId,
        aiData: { usage: _accumulatedUsage },
        model: modelUsed,
        referenceType: 'job_benchmark',
        description: `Benchmark de mercado - ${jobTitle}`,
      });
    }

    // Cache the result
    const benchmarkData = { references, insights };
    
    await supabase
      .from('job_benchmark_cache')
      .upsert({
        job_title_normalized: normalizedTitle,
        industry: industry || 'general',
        benchmark_data: benchmarkData,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      }, {
        onConflict: 'job_title_normalized,industry',
      });

    const response: BenchmarkResponse = {
      success: true,
      references,
      insights,
      cached: false,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in job-benchmark-search:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
