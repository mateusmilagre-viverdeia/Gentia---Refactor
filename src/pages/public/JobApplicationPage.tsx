import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  MapPin, 
  Briefcase, 
  Building2, 
  Upload, 
  CheckCircle2,
  ArrowLeft,
  AlertCircle
} from "lucide-react";
import { ScreeningStep } from "@/components/public/ScreeningStep";
import { JobLookupError } from "@/components/recruitment/JobLookupError";
import { sanitizeJobId } from "@/lib/jobIdSanitizer";
import type { ScreeningQuestion } from "@/types/job-workflow.types";

interface JobData {
  id: string;
  title: string;
  description: string | null;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  work_regime: string | null;
  work_modality: string | null;
  job_descriptions: {
    id: string;
    title: string;
    mission: string | null;
    responsibilities: string[] | null;
    required_skills: string[] | null;
  } | null;
  companies: {
    id: string;
    name: string;
    slug: string | null;
  } | null;
}

const WORK_REGIME_LABELS: Record<string, string> = {
  clt: "CLT",
  pj: "PJ",
  temporario: "Temporário",
  estagio: "Estágio",
  trainee: "Trainee",
};

export default function JobApplicationPage() {
  const { orgSlug, jobId: rawJobId } = useParams();
  const jobId = sanitizeJobId(rawJobId);
  const isInvalidLink = !jobId;
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompanyMember, setIsCompanyMember] = useState(false);
  const [checkingMembership, setCheckingMembership] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);
  
  // Screening state
  const [showScreening, setShowScreening] = useState(false);
  const [screeningData, setScreeningData] = useState<{
    applicationId: string;
    candidateId: string;
    questions: ScreeningQuestion[];
  } | null>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    linkedin: "",
    coverLetter: "",
  });

  // Check if user is a company member (not a pure candidate)
  useEffect(() => {
    const checkUserMembership = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        // Not logged in - redirect to job page
        navigate(`/vagas/${jobId}`);
        return;
      }

      setCurrentUser(session.user);

      // Check if user is member of any company
      const { data: memberships } = await supabase
        .from("account_members")
        .select("id, account_id")
        .eq("user_id", session.user.id)
        .eq("is_active", true);

      setIsCompanyMember(memberships && memberships.length > 0);
      setCheckingMembership(false);

      // Pre-fill email from session
      if (session.user.email) {
        setFormData(prev => ({ ...prev, email: session.user.email || "" }));
      }
    };

    checkUserMembership();
  }, [jobId, navigate]);

  // Fetch job data from database
  const { data: job, isLoading, error } = useQuery({
    queryKey: ["apply-job", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      
      const { data, error } = await supabase
        .from("recruitment_jobs")
        .select(`
          id, title, description, department, location, employment_type,
          work_regime, work_modality, status,
          job_descriptions (
            id, title, mission, responsibilities, required_skills
          ),
          companies:account_id (
            id, name, slug
          )
        `)
        .eq("id", jobId)
        .maybeSingle();

      if (error) {
        console.error("[JobApplicationPage] Job query error:", { jobId, rawJobId, error });
        throw error;
      }
      if (!data) {
        console.warn("[JobApplicationPage] Job not found", { jobId, rawJobId });
      }
      return data as (JobData & { status?: string }) | null;
    },
    enabled: !!jobId,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error("Por favor, preencha os campos obrigatórios");
      return;
    }

    if (!job || !currentUser) {
      toast.error("Erro ao processar candidatura");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Check if candidate already exists
      let candidateId: string;
      const { data: existingCandidate } = await supabase
        .from("recruitment_candidates")
        .select("id")
        .eq("email", formData.email)
        .maybeSingle();

      if (existingCandidate) {
        candidateId = existingCandidate.id;
      } else {
        // Create new candidate
        const { data: newCandidate, error: candidateError } = await supabase
          .from("recruitment_candidates")
          .insert({
            account_id: job.companies?.id,
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            phone: formData.phone || null,
            linkedin_url: formData.linkedin || null,
            stage: "new",
          })
          .select("id")
          .single();

        if (candidateError) throw candidateError;
        candidateId = newCandidate.id;
      }

      // Check if already applied to this job
      const { data: existingApplication } = await supabase
        .from("recruitment_applications")
        .select("id")
        .eq("candidate_id", candidateId)
        .eq("job_id", job.id)
        .maybeSingle();

      if (existingApplication) {
        toast.error("Você já se candidatou a esta vaga");
        setIsSubmitting(false);
        return;
      }

      // Create application
      const { data: newApp, error: applicationError } = await supabase
        .from("recruitment_applications")
        .insert({
          candidate_id: candidateId,
          job_id: job.id,
          status: "applied",
          cover_letter: formData.coverLetter || null,
        })
        .select("id")
        .single();

      if (applicationError) throw applicationError;

      // Check if job has a screening step in workflow
      const { data: workflowSteps } = await (supabase as any)
        .from("recruitment_job_workflow_steps")
        .select("step_type, threshold_config, position")
        .eq("job_id", job.id)
        .eq("is_active", true)
        .order("position", { ascending: true });

      const screeningStep = workflowSteps?.find((s: any) => s.step_type === "screening");
      
      if (screeningStep?.threshold_config?.questions?.length > 0) {
        setScreeningData({
          applicationId: newApp.id,
          candidateId,
          questions: screeningStep.threshold_config.questions as ScreeningQuestion[],
        });
        setShowScreening(true);
        setIsSubmitting(false);
        return;
      }

      setSubmitted(true);
      toast.success("Candidatura enviada com sucesso!");
    } catch (error) {
      console.error("Error submitting application:", error);
      toast.error("Erro ao enviar candidatura. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Invalid / truncated link — short-circuit before loading
  if (isInvalidLink) {
    console.warn("[JobApplicationPage] Invalid jobId in URL", { rawJobId });
    return <JobLookupError kind="invalid_link" careersSlug={orgSlug ?? null} />;
  }

  // Loading state
  if (isLoading || checkingMembership) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <Skeleton className="h-8 w-32 mb-4" />
            <Skeleton className="h-10 w-64" />
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
            <Skeleton className="h-96 w-full" />
        </main>
      </div>
    );
  }

  // User is a company member - show warning
  if (isCompanyMember) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground mb-6">
              Você está logado como membro de uma organização. Para se candidatar a vagas, utilize uma conta pessoal de candidato.
            </p>
            <div className="flex flex-col gap-3">
              <Button 
                variant="outline" 
                onClick={() => navigate(`/vagas/${jobId}`)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar à vaga
              </Button>
              <Button 
                variant="ghost"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate(`/vagas/${jobId}`);
                }}
              >
                Sair e usar outra conta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Job not found / closed
  if (!job) {
    return <JobLookupError kind="not_found" careersSlug={orgSlug ?? null} />;
  }
  if (job.status && job.status !== "active") {
    console.warn("[JobApplicationPage] Job inactive", { jobId, status: job.status });
    return (
      <JobLookupError
        kind="job_closed"
        careersSlug={orgSlug ?? job.companies?.slug ?? null}
        companyName={job.companies?.name ?? null}
      />
    );
  }

  const company = job.companies;
  const jd = job.job_descriptions;

  // Build description from job data
  const jobDescription = jd?.mission 
    ? `${jd.mission}${jd.responsibilities?.length ? '\n\nResponsabilidades:\n' + jd.responsibilities.map(r => `• ${r}`).join('\n') : ''}${jd.required_skills?.length ? '\n\nRequisitos:\n' + jd.required_skills.map(s => `• ${s}`).join('\n') : ''}`
    : job.description || "Descrição não disponível";

  // Screening state
  if (showScreening && screeningData && job) {
    const handleScreeningComplete = (passed: boolean) => {
      if (passed) {
        // Redirect to next step (cultural fit interview) — for now show success
        setShowScreening(false);
        setSubmitted(true);
      }
      // If failed, ScreeningStep already shows the rejection message
    };

    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{job.companies?.name || "Empresa"}</p>
                <h1 className="text-2xl font-bold">{job.title}</h1>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          <ScreeningStep
            applicationId={screeningData.applicationId}
            candidateId={screeningData.candidateId}
            jobId={job.id}
            accountId={job.companies?.id || ""}
            questions={screeningData.questions}
            onComplete={handleScreeningComplete}
          />
        </main>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Candidatura Enviada!</h2>
            <p className="text-muted-foreground mb-6">
              Obrigado por se candidatar à vaga de {job.title}. Entraremos em contato em breve.
            </p>
            <Button 
              variant="outline" 
              onClick={() => navigate(`/careers/${company?.slug || orgSlug}`)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Ver outras vagas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(`/vagas/${jobId}`)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{company?.name || "Empresa"}</p>
              <h1 className="text-2xl font-bold">{job.title}</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            {job.location && (
              <Badge variant="secondary" className="gap-1">
                <MapPin className="h-3 w-3" />
                {job.location}
              </Badge>
            )}
            {job.work_regime && (
              <Badge variant="secondary" className="gap-1">
                <Briefcase className="h-3 w-3" />
                {WORK_REGIME_LABELS[job.work_regime] || job.work_regime}
              </Badge>
            )}
            {job.department && (
              <Badge variant="outline">{job.department}</Badge>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-5 gap-8">
          {/* Job Description */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sobre a vaga</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                  {jobDescription}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Application Form */}
          <div className="md:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Formulário de Candidatura</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Nome *</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        placeholder="Seu nome"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Sobrenome *</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        placeholder="Seu sobrenome"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="seu@email.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+55 11 99999-9999"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn</Label>
                    <Input
                      id="linkedin"
                      value={formData.linkedin}
                      onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                      placeholder="https://linkedin.com/in/seu-perfil"
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Currículo</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer">
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Arraste seu currículo ou <span className="text-primary">clique para selecionar</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF, DOC ou DOCX (máx. 5MB)
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="coverLetter">Carta de apresentação</Label>
                    <Textarea
                      id="coverLetter"
                      value={formData.coverLetter}
                      onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })}
                      placeholder="Conte-nos um pouco sobre você e por que está interessado nesta vaga..."
                      rows={5}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Enviando..." : "Enviar candidatura"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
