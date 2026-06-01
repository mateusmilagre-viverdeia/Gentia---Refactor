/**
 * Generates Schema.org JobPosting JSON-LD for Google Jobs SEO
 * https://developers.google.com/search/docs/appearance/structured-data/job-posting
 */

export interface JobPostingSchemaInput {
  // Required fields
  title: string;
  description: string;
  datePosted: string; // ISO 8601 date
  
  // Organization
  companyName: string;
  companyLogoUrl?: string;
  companyWebsite?: string;
  
  // Location
  location?: string;
  workModality?: 'remoto' | 'presencial' | 'hibrido';
  
  // Employment
  employmentType?: 'clt' | 'pj' | 'temporario' | 'estagio' | 'trainee';
  
  // Salary
  salaryMin?: number;
  salaryMax?: number;
  hideSalary?: boolean;
  
  // Optional
  validThrough?: string; // ISO 8601 date - when job posting expires
  department?: string;
  jobUrl: string; // Direct link to job posting
}

interface JobPostingSchema {
  "@context": "https://schema.org";
  "@type": "JobPosting";
  title: string;
  description: string;
  datePosted: string;
  validThrough?: string;
  employmentType?: string | string[];
  hiringOrganization: {
    "@type": "Organization";
    name: string;
    sameAs?: string;
    logo?: string;
  };
  jobLocation?: {
    "@type": "Place";
    address: {
      "@type": "PostalAddress";
      addressLocality?: string;
      addressRegion?: string;
      addressCountry: string;
    };
  } | {
    "@type": "VirtualLocation";
  };
  jobLocationType?: "TELECOMMUTE";
  baseSalary?: {
    "@type": "MonetaryAmount";
    currency: string;
    value: {
      "@type": "QuantitativeValue";
      minValue?: number;
      maxValue?: number;
      value?: number;
      unitText: "MONTH";
    };
  };
  directApply?: boolean;
  identifier?: {
    "@type": "PropertyValue";
    name: string;
    value: string;
  };
}

// Map internal employment types to Schema.org values
const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  clt: "FULL_TIME",
  pj: "CONTRACTOR",
  temporario: "TEMPORARY",
  estagio: "INTERN",
  trainee: "INTERN",
};

// Parse Brazilian location string (e.g., "São Paulo, SP" or "Rio de Janeiro, RJ")
function parseLocation(location: string): { locality?: string; region?: string } {
  if (!location) return {};
  
  const parts = location.split(",").map(p => p.trim());
  if (parts.length >= 2) {
    return {
      locality: parts[0],
      region: parts[1],
    };
  }
  
  return { locality: location };
}

// Calculate validThrough date (30 days from now if not provided)
function getValidThrough(datePosted: string, validThrough?: string): string {
  if (validThrough) return validThrough;
  
  const posted = new Date(datePosted);
  const expires = new Date(posted);
  expires.setDate(expires.getDate() + 30);
  
  return expires.toISOString().split("T")[0];
}

// Build a full description from job_descriptions fields when description is null/empty
export interface JobDescriptionFields {
  mission?: string | null;
  responsibilities?: string[] | null;
  required_skills?: string[] | null;
  desired_skills?: string[] | null;
  behavioral_competencies?: string[] | null;
  benefits?: string[] | null;
  development?: string[] | null;
  indicators?: string[] | null;
}

export function buildFullDescription(
  fields: JobDescriptionFields | null | undefined,
  fallbackTitle?: string,
  fallbackCompany?: string
): string {
  if (!fields) {
    return `Vaga para ${fallbackTitle || "profissional"} na ${fallbackCompany || "nossa empresa"}. Candidate-se agora para fazer parte da nossa equipe e desenvolver sua carreira!`;
  }

  const parts: string[] = [];

  if (fields.mission) {
    parts.push(`Missão do Cargo:\n${fields.mission}`);
  }
  if (fields.responsibilities?.length) {
    parts.push(`Responsabilidades:\n${fields.responsibilities.map(r => `• ${r}`).join("\n")}`);
  }
  if (fields.required_skills?.length) {
    parts.push(`Requisitos:\n${fields.required_skills.map(s => `• ${s}`).join("\n")}`);
  }
  if (fields.desired_skills?.length) {
    parts.push(`Diferenciais:\n${fields.desired_skills.map(s => `• ${s}`).join("\n")}`);
  }
  if (fields.behavioral_competencies?.length) {
    parts.push(`Competências:\n${fields.behavioral_competencies.map(c => `• ${c}`).join("\n")}`);
  }
  if (fields.benefits?.length) {
    parts.push(`Benefícios:\n${fields.benefits.map(b => `• ${b}`).join("\n")}`);
  }
  if (fields.development?.length) {
    parts.push(`Desenvolvimento:\n${fields.development.map(d => `• ${d}`).join("\n")}`);
  }

  const result = parts.join("\n\n");

  if (result.length < 100) {
    return result + `\n\nCandidate-se agora para fazer parte da nossa equipe e desenvolver sua carreira em ${fallbackCompany || "nossa empresa"}!`;
  }

  return result;
}

// Clean and format description for Schema.org
function formatDescription(description: string, mission?: string): string {
  let fullDescription = "";
  
  if (mission) {
    fullDescription += `Missão do Cargo:\n${mission}\n\n`;
  }
  
  fullDescription += description;
  
  // Remove HTML tags if any
  fullDescription = fullDescription.replace(/<[^>]*>/g, "");
  
  // Ensure minimum length (Google requires at least 100 characters)
  if (fullDescription.length < 100) {
    fullDescription += " Candidate-se agora para fazer parte da nossa equipe!";
  }
  
  return fullDescription.trim();
}

export function generateJobPostingSchema(input: JobPostingSchemaInput): JobPostingSchema {
  const {
    title,
    description,
    datePosted,
    companyName,
    companyLogoUrl,
    companyWebsite,
    location,
    workModality,
    employmentType,
    salaryMin,
    salaryMax,
    hideSalary,
    validThrough,
    jobUrl,
  } = input;

  const schema: JobPostingSchema = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title,
    description: formatDescription(description),
    datePosted: datePosted.split("T")[0], // Ensure date-only format
    validThrough: getValidThrough(datePosted, validThrough),
    hiringOrganization: {
      "@type": "Organization",
      name: companyName,
      ...(companyWebsite && { sameAs: companyWebsite }),
      ...(companyLogoUrl && { logo: companyLogoUrl }),
    },
    directApply: true,
    identifier: {
      "@type": "PropertyValue",
      name: companyName,
      value: jobUrl,
    },
  };

  // Employment type
  if (employmentType && EMPLOYMENT_TYPE_MAP[employmentType]) {
    schema.employmentType = EMPLOYMENT_TYPE_MAP[employmentType];
  }

  // Location handling
  if (workModality === "remoto") {
    // Fully remote
    schema.jobLocationType = "TELECOMMUTE";
    schema.jobLocation = {
      "@type": "VirtualLocation",
    };
  } else if (location) {
    // Physical or hybrid location
    const { locality, region } = parseLocation(location);
    
    schema.jobLocation = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        ...(locality && { addressLocality: locality }),
        ...(region && { addressRegion: region }),
        addressCountry: "BR",
      },
    };
    
    // Hybrid also allows telecommute
    if (workModality === "hibrido") {
      schema.jobLocationType = "TELECOMMUTE";
    }
  }

  // Salary information (if not hidden)
  if (!hideSalary && (salaryMin || salaryMax)) {
    const value: JobPostingSchema["baseSalary"] = {
      "@type": "MonetaryAmount",
      currency: "BRL",
      value: {
        "@type": "QuantitativeValue",
        unitText: "MONTH",
      },
    };

    if (salaryMin && salaryMax && salaryMin !== salaryMax) {
      value.value.minValue = salaryMin;
      value.value.maxValue = salaryMax;
    } else {
      value.value.value = salaryMin || salaryMax;
    }

    schema.baseSalary = value;
  }

  return schema;
}

// Validate required fields for Google Jobs
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateJobPostingSchema(input: Partial<JobPostingSchemaInput>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!input.title) {
    errors.push("Título da vaga é obrigatório");
  }
  
  if (!input.description || input.description.length < 100) {
    errors.push("Descrição deve ter pelo menos 100 caracteres");
  }
  
  if (!input.datePosted) {
    errors.push("Data de publicação é obrigatória");
  }
  
  if (!input.companyName) {
    errors.push("Nome da empresa é obrigatório");
  }

  // Recommended fields
  if (!input.location && input.workModality !== "remoto") {
    warnings.push("Localização é recomendada para melhor visibilidade");
  }
  
  if (input.hideSalary || (!input.salaryMin && !input.salaryMax)) {
    warnings.push("Incluir faixa salarial aumenta em 30% os cliques");
  }
  
  if (!input.companyLogoUrl) {
    warnings.push("Logo da empresa melhora a apresentação no Google Jobs");
  }
  
  if (!input.employmentType) {
    warnings.push("Tipo de contratação é recomendado (CLT, PJ, etc.)");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Generate the full JSON-LD script tag content
export function generateJobPostingScriptTag(schema: JobPostingSchema): string {
  return JSON.stringify(schema, null, 2);
}
