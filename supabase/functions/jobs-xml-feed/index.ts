import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, max-age=3600', // Cache de 1 hora
};

// Mapeamentos de tipos
const WORK_REGIME_MAP: Record<string, string> = {
  clt: 'FULL_TIME',
  pj: 'CONTRACTOR',
  temporario: 'TEMPORARY',
  estagio: 'INTERN',
  trainee: 'INTERN',
  freelancer: 'CONTRACTOR',
};

const WORK_MODALITY_MAP: Record<string, string> = {
  remoto: 'REMOTE',
  presencial: 'ONSITE',
  hibrido: 'HYBRID',
  remote: 'REMOTE',
  onsite: 'ONSITE',
  hybrid: 'HYBRID',
};

const EXPERIENCE_LEVEL_MAP: Record<string, string> = {
  junior: 'ENTRY_LEVEL',
  pleno: 'MID_SENIOR',
  senior: 'SENIOR',
  especialista: 'SENIOR',
  gerente: 'DIRECTOR',
  diretor: 'EXECUTIVE',
  estagiario: 'INTERN',
};

interface JobDescription {
  mission: string | null;
  responsibilities: string[] | null;
  required_skills: string[] | null;
  desired_skills: string[] | null;
  benefits: string[] | null;
}

interface Job {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  work_regime: string | null;
  work_modality: string | null;
  budget_min: number | null;
  budget_max: number | null;
  hide_salary: boolean | null;
  published_at: string | null;
  department: string | null;
  account_id: string;
  job_descriptions: JobDescription | null;
}

interface Company {
  id: string;
  name: string;
  website: string | null;
  sector: string | null;
}

interface CareerSettings {
  logo_url: string | null;
}

function escapeXml(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  return new Date(dateStr).toISOString().split('T')[0];
}

function formatSalary(min: number | null, max: number | null, hide: boolean | null): string {
  if (hide) return '';
  if (!min && !max) return '';
  
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  
  if (min && max) {
    return `${formatter.format(min)} - ${formatter.format(max)}`;
  } else if (min) {
    return `A partir de ${formatter.format(min)}`;
  } else if (max) {
    return `Até ${formatter.format(max)}`;
  }
  return '';
}

function buildRichDescription(job: Job, companyName: string): string {
  if (job.description) return job.description;
  
  const jd = job.job_descriptions;
  if (!jd) return `Vaga para ${job.title} na ${companyName}. Candidate-se agora!`;
  
  const parts: string[] = [];
  if (jd.mission) parts.push(jd.mission);
  if (jd.responsibilities?.length) parts.push(`Responsabilidades: ${jd.responsibilities.join("; ")}`);
  if (jd.required_skills?.length) parts.push(`Requisitos: ${jd.required_skills.join("; ")}`);
  if (jd.desired_skills?.length) parts.push(`Diferenciais: ${jd.desired_skills.join("; ")}`);
  if (jd.benefits?.length) parts.push(`Benefícios: ${jd.benefits.join("; ")}`);
  
  const result = parts.join(". ");
  return result.length >= 100 ? result : result + `. Candidate-se agora para fazer parte da equipe em ${companyName}!`;
}

function generateJobXml(
  job: Job, 
  company: Company, 
  careerSettings: CareerSettings | null,
  baseUrl: string
): string {
  const jobType = WORK_REGIME_MAP[job.work_regime?.toLowerCase() || ''] || 'FULL_TIME';
  const remoteType = WORK_MODALITY_MAP[job.work_modality?.toLowerCase() || ''] || 'ONSITE';
  const salary = formatSalary(job.budget_min, job.budget_max, job.hide_salary);
  const pubDate = formatDate(job.published_at);
  const jobUrl = `${baseUrl}/vagas/${job.id}`;
  const applyUrl = `${baseUrl}/vagas/${job.id}?apply=true`;
  const logoUrl = careerSettings?.logo_url || '';
  const richDescription = buildRichDescription(job, company.name);
  
  const country = 'BR';
  
  return `  <job id="${job.id}">
    <title><![CDATA[${job.title}]]></title>
    <link>${escapeXml(jobUrl)}</link>
    <company><![CDATA[${company.name}]]></company>
    <location><![CDATA[${job.location || 'Brasil'}]]></location>
    <country>${country}</country>
    <description><![CDATA[${richDescription}]]></description>
    <pubdate>${pubDate}</pubdate>
    ${salary ? `<salary><![CDATA[${salary}]]></salary>` : ''}
    <jobtype>${jobType}</jobtype>
    <remotetype>${remoteType}</remotetype>
    ${job.department ? `<category><![CDATA[${job.department}]]></category>` : ''}
    ${logoUrl ? `<logo>${escapeXml(logoUrl)}</logo>` : ''}
    <apply_url>${escapeXml(applyUrl)}</apply_url>
  </job>`;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Pegar parâmetros da URL
    const url = new URL(req.url);
    const orgId = url.searchParams.get('org');
    const limit = parseInt(url.searchParams.get('limit') || '1000', 10);
    
    // Buscar vagas ativas e públicas
    let query = supabase
      .from('recruitment_jobs')
      .select('id, title, description, location, work_regime, work_modality, budget_min, budget_max, hide_salary, published_at, department, account_id, job_descriptions(mission, responsibilities, required_skills, desired_skills, benefits)')
      .eq('status', 'active')
      .eq('is_public', true)
      .order('published_at', { ascending: false })
      .limit(limit);
    
    // Filtrar por organização se especificado
    if (orgId) {
      query = query.eq('account_id', orgId);
    }
    
    const { data: jobs, error: jobsError } = await query;
    
    if (jobsError) {
      console.error('[jobs-xml-feed] Error fetching jobs:', jobsError);
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><error>Failed to fetch jobs</error>`,
        { status: 500, headers: corsHeaders }
      );
    }
    
    if (!jobs || jobs.length === 0) {
      console.log('[jobs-xml-feed] No active public jobs found');
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>\n<jobs count="0">\n</jobs>`,
        { status: 200, headers: corsHeaders }
      );
    }
    
    // Coletar IDs únicos de empresas
    const normalizedJobs = (jobs || []).map((job: any) => ({
      ...job,
      job_descriptions: Array.isArray(job.job_descriptions) ? job.job_descriptions[0] || null : job.job_descriptions,
    })) as Job[];

    const accountIds = [...new Set(normalizedJobs.map((j) => j.account_id))];
    
    // Buscar dados das empresas
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, website, sector')
      .in('id', accountIds);
    
    if (companiesError) {
      console.error('[jobs-xml-feed] Error fetching companies:', companiesError);
    }
    
    // Buscar configurações de página de carreiras (para logos)
    const { data: careerSettings, error: careerError } = await supabase
      .from('careers_page_settings')
      .select('account_id, logo_url')
      .in('account_id', accountIds);
    
    if (careerError) {
      console.error('[jobs-xml-feed] Error fetching career settings:', careerError);
    }
    
    // Criar mapas para lookup rápido
    const companyMap = new Map<string, Company>();
    (companies || []).forEach((c: Company) => companyMap.set(c.id, c));
    
    const careerMap = new Map<string, CareerSettings>();
    (careerSettings || []).forEach((cs: { account_id: string; logo_url: string | null }) => 
      careerMap.set(cs.account_id, { logo_url: cs.logo_url })
    );
    
    // URL base para links das vagas
    const baseUrl = (Deno.env.get('PUBLIC_SITE_URL') || Deno.env.get('SITE_URL') || req.headers.get('origin') || 'https://gentia.lovable.app').replace(/\/$/, '');
    
    // Gerar XML para cada vaga
    const jobsXml = normalizedJobs.map((job) => {
      const company = companyMap.get(job.account_id);
      if (!company) {
        console.warn(`[jobs-xml-feed] Company not found for job ${job.id}`);
        return '';
      }
      const settings = careerMap.get(job.account_id) || null;
      return generateJobXml(job, company, settings, baseUrl);
    }).filter(Boolean).join('\n');
    
    const fullXml = `<?xml version="1.0" encoding="UTF-8"?>
<jobs count="${jobs.length}" generated="${new Date().toISOString()}">
${jobsXml}
</jobs>`;
    
    console.log(`[jobs-xml-feed] Generated feed with ${jobs.length} jobs`);
    
    return new Response(fullXml, { 
      status: 200, 
      headers: corsHeaders 
    });
    
  } catch (error) {
    console.error('[jobs-xml-feed] Unexpected error:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><error>Internal server error</error>`,
      { status: 500, headers: corsHeaders }
    );
  }
});
