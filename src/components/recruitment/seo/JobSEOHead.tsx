import { useEffect } from "react";
import { 
  generateJobPostingSchema, 
  JobPostingSchemaInput,
  buildFullDescription,
  JobDescriptionFields,
} from "@/utils/generateJobPostingSchema";
import { getPublicJobUrl } from "@/lib/publicUrl";

interface JobSEOHeadProps {
  job: {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    work_modality: string | null;
    work_regime: string | null;
    budget_min: number | null;
    budget_max: number | null;
    hide_salary: boolean | null;
    created_at: string;
    department?: string | null;
  };
  company: {
    name: string;
    website?: string | null;
  } | null;
  logoUrl?: string | null;
  mission?: string | null;
  jobDescription?: JobDescriptionFields | null;
}

export function JobSEOHead({ job, company, logoUrl, mission, jobDescription }: JobSEOHeadProps) {
  useEffect(() => {
    // Build rich description: prefer job.description, fallback to compiled job_descriptions fields
    const richDescription = job.description 
      ? (mission ? `${mission}\n\n${job.description}` : job.description)
      : buildFullDescription(jobDescription, job.title, company?.name);

    // Generate Schema.org JobPosting
    const schemaInput: JobPostingSchemaInput = {
      title: job.title,
      description: richDescription,
      datePosted: job.created_at,
      companyName: company?.name || "Empresa",
      companyLogoUrl: logoUrl || undefined,
      companyWebsite: company?.website || undefined,
      location: job.location || undefined,
      workModality: job.work_modality as "remoto" | "presencial" | "hibrido" | undefined,
      employmentType: job.work_regime as "clt" | "pj" | "temporario" | "estagio" | "trainee" | undefined,
      salaryMin: job.budget_min || undefined,
      salaryMax: job.budget_max || undefined,
      hideSalary: job.hide_salary || false,
      department: job.department || undefined,
      jobUrl: getPublicJobUrl(job.id),
    };

    const schema = generateJobPostingSchema(schemaInput);

    // Create or update the script tag
    const scriptId = "job-posting-schema";
    let scriptTag = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!scriptTag) {
      scriptTag = document.createElement("script");
      scriptTag.id = scriptId;
      scriptTag.setAttribute("type", "application/ld+json");
      document.head.appendChild(scriptTag);
    }

    scriptTag.textContent = JSON.stringify(schema);

    // Inject/replace canonical link pointing to the production URL
    const canonicalId = "job-canonical-link";
    let canonicalTag = document.getElementById(canonicalId) as HTMLLinkElement | null;
    if (!canonicalTag) {
      canonicalTag = document.createElement("link");
      canonicalTag.id = canonicalId;
      canonicalTag.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.setAttribute("href", getPublicJobUrl(job.id));

    // Update page title and meta description
    const originalTitle = document.title;
    document.title = `${job.title} | ${company?.name || "Vagas"}`;

    const metaDescription = document.querySelector('meta[name="description"]');
    const originalDescription = metaDescription?.getAttribute("content") || "";
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        `${job.title} em ${company?.name || "empresa"}. ${job.location ? `Local: ${job.location}.` : ""} ${job.work_modality ? `Modalidade: ${job.work_modality}.` : ""} Candidate-se agora!`
      );
    }

    // Cleanup on unmount
    return () => {
      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
        existingScript.remove();
      }
      const existingCanonical = document.getElementById(canonicalId);
      if (existingCanonical) {
        existingCanonical.remove();
      }
      document.title = originalTitle;
      if (metaDescription) {
        metaDescription.setAttribute("content", originalDescription);
      }
    };
  }, [job, company, logoUrl, mission]);

  return null;
}
