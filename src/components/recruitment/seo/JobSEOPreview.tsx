import { getPublicJobUrl } from "@/lib/publicUrl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Copy, 
  MapPin, 
  Building2, 
  DollarSign,
  Briefcase,
  Search
} from "lucide-react";
import { 
  generateJobPostingSchema, 
  validateJobPostingSchema, 
  JobPostingSchemaInput,
  ValidationResult 
} from "@/utils/generateJobPostingSchema";
import { toast } from "sonner";

interface JobSEOPreviewProps {
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
}

const WORK_MODALITY_LABELS: Record<string, string> = {
  remoto: "Remoto",
  presencial: "Presencial",
  hibrido: "Híbrido",
};

const WORK_REGIME_LABELS: Record<string, string> = {
  clt: "CLT - Tempo Integral",
  pj: "Contrato PJ",
  temporario: "Temporário",
  estagio: "Estágio",
  trainee: "Trainee",
};

export function JobSEOPreview({ job, company, logoUrl, mission }: JobSEOPreviewProps) {
  const schemaInput: JobPostingSchemaInput = {
    title: job.title,
    description: mission 
      ? `${mission}\n\n${job.description || ""}`
      : job.description || `Vaga para ${job.title}`,
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

  const validation: ValidationResult = validateJobPostingSchema(schemaInput);
  const schema = generateJobPostingSchema(schemaInput);

  const handleCopySchema = () => {
    navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
    toast.success("Schema JSON-LD copiado!");
  };

  const handleTestWithGoogle = () => {
    const testUrl = `https://search.google.com/test/rich-results?url=${encodeURIComponent(getPublicJobUrl(job.id))}`;
    window.open(testUrl, "_blank");
  };

  const formatSalary = (min: number | null, max: number | null): string => {
    if (!min && !max) return "";
    if (min === max || !max) {
      return `R$ ${min?.toLocaleString("pt-BR")}/mês`;
    }
    return `R$ ${min?.toLocaleString("pt-BR")} - R$ ${max?.toLocaleString("pt-BR")}/mês`;
  };

  return (
    <div className="space-y-6">
      {/* Validation Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-5 w-5 text-primary" />
            SEO para Google Jobs
          </CardTitle>
          <CardDescription>
            Otimização Schema.org para aparecer no Google Jobs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Validation Status Badge */}
          <div className="flex items-center gap-2">
            {validation.isValid ? (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Schema válido
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                {validation.errors.length} erro(s)
              </Badge>
            )}
            {validation.warnings.length > 0 && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                {validation.warnings.length} sugestão(ões)
              </Badge>
            )}
          </div>

          {/* Errors */}
          {validation.errors.length > 0 && (
            <div className="rounded-lg bg-destructive/10 p-3 space-y-1">
              <p className="text-sm font-medium text-destructive">Erros:</p>
              <ul className="text-sm text-destructive/90 space-y-1">
                {validation.errors.map((error, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {validation.warnings.length > 0 && (
            <div className="rounded-lg bg-amber-50 p-3 space-y-1">
              <p className="text-sm font-medium text-amber-800">Sugestões de melhoria:</p>
              <ul className="text-sm text-amber-700 space-y-1">
                {validation.warnings.map((warning, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopySchema}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar Schema
            </Button>
            <Button variant="outline" size="sm" onClick={handleTestWithGoogle}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Testar no Google
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Google Jobs Preview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Preview no Google Jobs</CardTitle>
          <CardDescription>
            Aproximação de como a vaga aparecerá nos resultados do Google
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 bg-background">
            {/* Google Jobs Card Mock */}
            <div className="flex gap-3">
              {/* Company Logo */}
              <div className="shrink-0">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt={company?.name || "Logo"} 
                    className="h-12 w-12 rounded object-contain bg-muted"
                  />
                ) : (
                  <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                )}
              </div>

              {/* Job Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-primary text-base truncate hover:underline cursor-pointer">
                  {job.title}
                </h3>
                <p className="text-sm text-green-600 dark:text-green-500 truncate">
                  {company?.name || "Empresa"}
                </p>
                
                {/* Details Row */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                  {job.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {job.location}
                    </span>
                  )}
                  {job.work_modality && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
                      {WORK_MODALITY_LABELS[job.work_modality] || job.work_modality}
                    </span>
                  )}
                  {job.work_regime && (
                    <Badge variant="secondary" className="text-[10px] py-0 h-4">
                      {WORK_REGIME_LABELS[job.work_regime] || job.work_regime}
                    </Badge>
                  )}
                </div>

                {/* Salary */}
                {!job.hide_salary && (job.budget_min || job.budget_max) && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-foreground">
                    <DollarSign className="h-3 w-3 text-green-600 dark:text-green-500" />
                    <span className="text-green-700 dark:text-green-500 font-medium">
                      {formatSalary(job.budget_min, job.budget_max)}
                    </span>
                  </div>
                )}

                {/* Posted Date */}
                <p className="text-[11px] text-muted-foreground mt-1">
                  Publicada há {Math.floor((Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24))} dias via {company?.name || "Site da empresa"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Raw Schema Preview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Schema JSON-LD</CardTitle>
          <CardDescription>
            Código estruturado inserido automaticamente na página
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs max-h-64 overflow-y-auto">
            <code>{JSON.stringify(schema, null, 2)}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
