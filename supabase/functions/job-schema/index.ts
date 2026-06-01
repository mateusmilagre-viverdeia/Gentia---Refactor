import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  clt: "FULL_TIME",
  pj: "CONTRACTOR",
  temporario: "TEMPORARY",
  estagio: "INTERN",
  trainee: "INTERN",
};

function buildDescription(jobDesc: any, fallbackTitle: string, companyName: string): string {
  if (!jobDesc) {
    return `Vaga para ${fallbackTitle} na ${companyName}. Candidate-se agora para fazer parte da equipe!`;
  }

  const parts: string[] = [];
  if (jobDesc.mission) parts.push(`Missão do Cargo:\n${jobDesc.mission}`);
  if (jobDesc.responsibilities?.length) parts.push(`Responsabilidades:\n${jobDesc.responsibilities.map((r: string) => `• ${r}`).join("\n")}`);
  if (jobDesc.required_skills?.length) parts.push(`Requisitos:\n${jobDesc.required_skills.map((s: string) => `• ${s}`).join("\n")}`);
  if (jobDesc.desired_skills?.length) parts.push(`Diferenciais:\n${jobDesc.desired_skills.map((s: string) => `• ${s}`).join("\n")}`);
  if (jobDesc.benefits?.length) parts.push(`Benefícios:\n${jobDesc.benefits.map((b: string) => `• ${b}`).join("\n")}`);

  const result = parts.join("\n\n");
  return result.length >= 100 ? result : result + `\n\nCandidate-se agora para fazer parte da equipe em ${companyName}!`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const jobId = url.searchParams.get('jobId') || url.searchParams.get('id');

    if (!jobId) {
      return new Response(JSON.stringify({ error: 'jobId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch job
    const { data: job, error: jobError } = await supabase
      .from('recruitment_jobs')
      .select('id, title, description, location, work_regime, work_modality, budget_min, budget_max, hide_salary, published_at, created_at, department, account_id, job_description_id')
      .eq('id', jobId)
      .eq('status', 'active')
      .eq('is_public', true)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch company, job description, career settings in parallel
    const [companyRes, jobDescRes, careerRes] = await Promise.all([
      supabase.from('companies').select('name, website').eq('id', job.account_id).single(),
      job.job_description_id
        ? supabase.from('job_descriptions').select('mission, responsibilities, required_skills, desired_skills, benefits, development, behavioral_competencies').eq('id', job.job_description_id).single()
        : Promise.resolve({ data: null, error: null }),
      supabase.from('careers_page_settings').select('logo_url').eq('account_id', job.account_id).single(),
    ]);

    const company = companyRes.data;
    const jobDesc = jobDescRes.data;
    const logoUrl = careerRes.data?.logo_url;
    const companyName = company?.name || 'Empresa';
    const baseUrl = 'https://gentia.lovable.app';
    const jobUrl = `${baseUrl}/vagas/${job.id}`;

    // Build description
    const description = job.description || buildDescription(jobDesc, job.title, companyName);

    // Build Schema.org JobPosting
    const schema: any = {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: job.title,
      description: description,
      datePosted: (job.published_at || job.created_at).split("T")[0],
      hiringOrganization: {
        "@type": "Organization",
        name: companyName,
        ...(company?.website && { sameAs: company.website }),
        ...(logoUrl && { logo: logoUrl }),
      },
      directApply: true,
      identifier: {
        "@type": "PropertyValue",
        name: companyName,
        value: jobUrl,
      },
    };

    // Employment type
    if (job.work_regime && EMPLOYMENT_TYPE_MAP[job.work_regime]) {
      schema.employmentType = EMPLOYMENT_TYPE_MAP[job.work_regime];
    }

    // Location
    if (job.work_modality === 'remoto') {
      schema.jobLocationType = "TELECOMMUTE";
      schema.jobLocation = { "@type": "VirtualLocation" };
    } else if (job.location) {
      const parts = job.location.split(",").map((p: string) => p.trim());
      schema.jobLocation = {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          ...(parts[0] && { addressLocality: parts[0] }),
          ...(parts[1] && { addressRegion: parts[1] }),
          addressCountry: "BR",
        },
      };
      if (job.work_modality === 'hibrido') {
        schema.jobLocationType = "TELECOMMUTE";
      }
    }

    // Salary
    if (!job.hide_salary && (job.budget_min || job.budget_max)) {
      const salaryValue: any = { "@type": "QuantitativeValue", unitText: "MONTH" };
      if (job.budget_min && job.budget_max && job.budget_min !== job.budget_max) {
        salaryValue.minValue = job.budget_min;
        salaryValue.maxValue = job.budget_max;
      } else {
        salaryValue.value = job.budget_min || job.budget_max;
      }
      schema.baseSalary = {
        "@type": "MonetaryAmount",
        currency: "BRL",
        value: salaryValue,
      };
    }

    // Valid through (30 days from posting)
    const posted = new Date(job.published_at || job.created_at);
    const expires = new Date(posted);
    expires.setDate(expires.getDate() + 30);
    schema.validThrough = expires.toISOString().split("T")[0];

    // Return pre-rendered HTML with JSON-LD
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>${job.title} | ${companyName}</title>
  <meta name="description" content="${job.title} em ${companyName}. ${job.location ? `Local: ${job.location}.` : ''} Candidate-se agora!">
  <link rel="canonical" href="${jobUrl}">
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
  <meta http-equiv="refresh" content="0;url=${jobUrl}">
</head>
<body>
  <h1>${job.title} - ${companyName}</h1>
  <p>${description.substring(0, 300)}</p>
  <a href="${jobUrl}">Ver vaga completa</a>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (error) {
    console.error('[job-schema] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
