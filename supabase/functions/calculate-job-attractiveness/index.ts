import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScoreBreakdown {
  salary: number;
  benefits: number;
  description: number;
  selling: number;
  culture: number;
  flexibility: number;
  responsiveness: number;
}

interface CalculationResult {
  score: number;
  breakdown: ScoreBreakdown;
  suggestions: string[];
}

// Weight configuration for each scoring category
const WEIGHTS = {
  salary: 20,        // Faixa salarial preenchida
  benefits: 15,      // Benefícios listados
  description: 20,   // Descrição completa
  selling: 15,       // Pitch de venda da empresa
  culture: 15,       // Valores culturais definidos
  flexibility: 10,   // Modalidade flexível
  responsiveness: 5, // Tempo de resposta
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { jobId, accountId } = await req.json();

    if (!jobId || !accountId) {
      return new Response(
        JSON.stringify({ error: "jobId and accountId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📊 Calculating attractiveness for job ${jobId}`);

    // 1. Fetch job details
    const { data: job, error: jobError } = await supabase
      .from("recruitment_jobs")
      .select(`
        *,
        selling_content:recruitment_selling_content(*)
      `)
      .eq("id", jobId)
      .maybeSingle();

    if (jobError || !job) {
      console.error("Error fetching job:", jobError);
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch company culture (values)
    const { data: values } = await supabase
      .from("company_values")
      .select("id")
      .eq("account_id", accountId)
      .limit(1);

    // 3. Calculate response time metrics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: applications } = await supabase
      .from("recruitment_applications")
      .select("applied_at, evaluated_at")
      .eq("job_id", jobId)
      .not("evaluated_at", "is", null)
      .gte("applied_at", thirtyDaysAgo.toISOString())
      .limit(100);

    // Calculate average response time in hours
    let avgResponseHours = 0;
    if (applications && applications.length > 0) {
      const totalHours = applications.reduce((sum, app) => {
        const applied = new Date(app.applied_at).getTime();
        const evaluated = new Date(app.evaluated_at).getTime();
        return sum + (evaluated - applied) / (1000 * 60 * 60);
      }, 0);
      avgResponseHours = totalHours / applications.length;
    }

    // 4. Calculate each score component
    const breakdown: ScoreBreakdown = {
      salary: 0,
      benefits: 0,
      description: 0,
      selling: 0,
      culture: 0,
      flexibility: 0,
      responsiveness: 0,
    };

    const suggestions: string[] = [];

    // SALARY (20 points)
    if (job.budget_min && job.budget_max) {
      breakdown.salary = WEIGHTS.salary;
    } else if (job.budget_min || job.budget_max) {
      breakdown.salary = Math.floor(WEIGHTS.salary * 0.5);
      suggestions.push("Adicione a faixa salarial completa (mínimo e máximo) para maior transparência");
    } else {
      suggestions.push("Adicione a faixa salarial para atrair mais candidatos qualificados");
    }

    // BENEFITS (15 points)
    const benefits = job.benefits || [];
    if (benefits.length >= 5) {
      breakdown.benefits = WEIGHTS.benefits;
    } else if (benefits.length >= 3) {
      breakdown.benefits = Math.floor(WEIGHTS.benefits * 0.7);
      suggestions.push("Adicione mais benefícios para aumentar a atratividade da vaga");
    } else if (benefits.length > 0) {
      breakdown.benefits = Math.floor(WEIGHTS.benefits * 0.4);
      suggestions.push("Liste ao menos 5 benefícios para competir por melhores candidatos");
    } else {
      suggestions.push("Adicione os benefícios oferecidos - é um dos principais fatores de decisão");
    }

    // DESCRIPTION (20 points)
    const description = job.description || "";
    const descLength = description.length;
    
    if (descLength >= 1000) {
      breakdown.description = WEIGHTS.description;
    } else if (descLength >= 500) {
      breakdown.description = Math.floor(WEIGHTS.description * 0.7);
      suggestions.push("Expanda a descrição da vaga com mais detalhes sobre responsabilidades e requisitos");
    } else if (descLength >= 200) {
      breakdown.description = Math.floor(WEIGHTS.description * 0.4);
      suggestions.push("A descrição está curta - adicione mais informações sobre o dia-a-dia e expectativas");
    } else {
      suggestions.push("Escreva uma descrição completa da vaga para atrair candidatos alinhados");
    }

    // SELLING PITCH (15 points)
    const sellingContent = job.selling_content;
    if (sellingContent && sellingContent.length > 0) {
      const firstSelling = sellingContent[0];
      const hasIntro = firstSelling.intro && firstSelling.intro.length > 100;
      const hasValues = firstSelling.values && Object.keys(firstSelling.values || {}).length >= 3;
      const hasBenefits = firstSelling.benefits && Object.keys(firstSelling.benefits || {}).length >= 3;
      
      if (hasIntro && hasValues && hasBenefits) {
        breakdown.selling = WEIGHTS.selling;
      } else if (hasIntro || hasValues || hasBenefits) {
        breakdown.selling = Math.floor(WEIGHTS.selling * 0.6);
        suggestions.push("Complete o pitch de venda da empresa com introdução, valores e benefícios");
      } else {
        breakdown.selling = Math.floor(WEIGHTS.selling * 0.3);
        suggestions.push("Desenvolva o pitch de venda para mostrar o diferencial da empresa");
      }
    } else {
      suggestions.push("Crie um pitch de venda da empresa para destacar sua cultura e proposta de valor");
    }

    // CULTURE (15 points)
    if (values && values.length > 0) {
      breakdown.culture = WEIGHTS.culture;
    } else {
      suggestions.push("Defina os valores culturais da empresa para atrair candidatos com fit cultural");
    }

    // FLEXIBILITY (10 points)
    const workModality = job.work_modality?.toLowerCase() || "";
    if (workModality === "remote" || workModality === "remoto") {
      breakdown.flexibility = WEIGHTS.flexibility;
    } else if (workModality === "hybrid" || workModality === "híbrido" || workModality === "hibrido") {
      breakdown.flexibility = Math.floor(WEIGHTS.flexibility * 0.8);
    } else if (workModality === "presencial" || workModality === "on-site") {
      breakdown.flexibility = Math.floor(WEIGHTS.flexibility * 0.3);
      suggestions.push("Considere oferecer modalidade híbrida ou remota para ampliar o pool de candidatos");
    } else {
      suggestions.push("Especifique a modalidade de trabalho (remoto, híbrido ou presencial)");
    }

    // RESPONSIVENESS (5 points)
    if (applications && applications.length >= 5) {
      if (avgResponseHours <= 24) {
        breakdown.responsiveness = WEIGHTS.responsiveness;
      } else if (avgResponseHours <= 48) {
        breakdown.responsiveness = Math.floor(WEIGHTS.responsiveness * 0.7);
      } else if (avgResponseHours <= 72) {
        breakdown.responsiveness = Math.floor(WEIGHTS.responsiveness * 0.4);
        suggestions.push("Melhore o tempo de resposta aos candidatos (atualmente > 48h)");
      } else {
        suggestions.push("O tempo médio de resposta está alto (> 72h) - candidatos perdem interesse");
      }
    } else {
      // Not enough data to calculate responsiveness
      breakdown.responsiveness = Math.floor(WEIGHTS.responsiveness * 0.5);
    }

    // 5. Calculate total score
    const totalScore = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

    console.log(`📊 Attractiveness calculated: ${totalScore}/100`);

    // 6. Update job with score
    const { error: updateError } = await supabase
      .from("recruitment_jobs")
      .update({
        attractiveness_score: totalScore,
        attractiveness_breakdown: breakdown,
        attractiveness_suggestions: suggestions,
        attractiveness_calculated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (updateError) {
      console.error("Error updating job:", updateError);
    }

    const result: CalculationResult = {
      score: totalScore,
      breakdown,
      suggestions,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error calculating attractiveness:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
