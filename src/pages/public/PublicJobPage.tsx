import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTrackingCapture, getTrackingData } from "@/hooks/useTrackingCapture";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CandidateAuthModal } from "@/components/recruitment/CandidateAuthModal";
import { CandidateNavbar } from "@/components/candidate/CandidateNavbar";
import { JobSEOHead } from "@/components/recruitment/seo";
import { JobLookupError } from "@/components/recruitment/JobLookupError";
import { sanitizeJobId, type JobLookupErrorKind } from "@/lib/jobIdSanitizer";
import { toast } from "sonner";
import logoGentia from "@/assets/logo-gentia-black.png";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  MapPin, 
  Briefcase, 
  Building2, 
  Clock,
  DollarSign,
  CheckCircle2,
  Target,
  BookOpen,
  Users,
  Gift,
  ArrowLeft,
  AlertCircle,
  TrendingUp,
  Star,
  Loader2,
  Linkedin,
  MessageCircle,
  Link2,
  ExternalLink,
  ArrowRight,
  Play
} from "lucide-react";

interface JobData {
  id: string;
  title: string;
  description: string | null;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  budget_min: number | null;
  budget_max: number | null;
  status: string;
  work_regime: string | null;
  work_modality: string | null;
  hide_salary: boolean | null;
  additional_info: string | null;
  created_at: string;
  job_description_id: string | null;
  account_id: string;
}

interface JobDescription {
  id: string;
  title: string;
  area: string | null;
  mission: string | null;
  responsibilities: string[] | null;
  required_skills: string[] | null;
  desired_skills: string[] | null;
  behavioral_competencies: string[] | null;
  development: string[] | null;
  benefits: string[] | null;
  indicators: string[] | null;
}

interface Company {
  id: string;
  name: string;
  slug: string | null;
}

interface CareersSettings {
  job_show_company_section?: boolean;
  job_show_mission?: boolean;
  job_show_responsibilities?: boolean;
  job_show_indicators?: boolean;
  job_show_required_skills?: boolean;
  job_show_desired_skills?: boolean;
  job_show_competencies?: boolean;
  job_show_benefits?: boolean;
  job_show_development?: boolean;
  job_show_related_jobs?: boolean;
  job_show_share_buttons?: boolean;
  job_show_gentia_branding?: boolean;
  description?: string | null;
  logo_url?: string | null;
  // New fields
  job_video_url?: string | null;
  job_use_custom_color?: boolean;
  job_primary_color?: string;
  primary_color?: string;
}

interface RelatedJob {
  id: string;
  title: string;
  location: string | null;
  work_modality: string | null;
}

interface PublicJobResult {
  job: JobData;
  company: Company | null;
  job_description: JobDescription | null;
  settings: CareersSettings | null;
  relatedJobs: RelatedJob[];
}

const WORK_REGIME_LABELS: Record<string, string> = {
  clt: "CLT",
  pj: "PJ",
  temporario: "Temporário",
  estagio: "Estágio",
  trainee: "Trainee",
};

const WORK_MODALITY_LABELS: Record<string, string> = {
  remoto: "Remoto",
  presencial: "Presencial",
  hibrido: "Híbrido",
};

export default function PublicJobPage() {
  const { jobId: rawJobId } = useParams();
  const jobId = sanitizeJobId(rawJobId);
  const isInvalidLink = !jobId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Capture tracking data on first visit (first-touch attribution)
  useTrackingCapture();

  // Fetch candidate profile for navbar display (does not gate the apply flow —
  // any logged-in user can apply, even if they're also a member of another org)
  const { data: candidateProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["candidate-profile-navbar", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("candidate_profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("[PublicJobPage] Error fetching candidate profile:", error);
        return null;
      }

      return data;
    },
    enabled: !!user?.id,
  });

  // Any logged-in user is treated as a candidate on the public job page
  const isCandidate = !!user;
  const isLoadingUserType = !!user && isLoadingProfile;


  // Simple direct query - no RLS filtering issues
  const { data: publicJobData, isLoading, error } = useQuery({
    queryKey: ["public-job", jobId],
    queryFn: async (): Promise<PublicJobResult | null> => {
      if (!jobId) return null;

      // Fetch job WITHOUT status filter so we can distinguish "closed" from "not found"
      const { data: jobData, error: jobErr } = await supabase
        .from("recruitment_jobs")
        .select("*")
        .eq("id", jobId)
        .maybeSingle();

      if (jobErr) {
        console.error("[PublicJobPage] Job query error:", { jobId, rawJobId, error: jobErr });
        throw jobErr;
      }
      if (!jobData) {
        console.warn("[PublicJobPage] Job not found", { jobId, rawJobId });
        return null;
      }

      // Fetch company
      const { data: companyData } = await supabase
        .from("companies")
        .select("id, name, slug")
        .eq("id", jobData.account_id)
        .maybeSingle();

      // Fetch job description if exists
      let jobDescData = null;
      if (jobData.job_description_id) {
        const { data: jdData } = await supabase
          .from("job_descriptions")
          .select("*")
          .eq("id", jobData.job_description_id)
          .maybeSingle();
        jobDescData = jdData;
      }

      // Fetch careers page settings
      const { data: settingsData } = await supabase
        .from("careers_page_settings")
        .select("job_show_company_section, job_show_mission, job_show_responsibilities, job_show_indicators, job_show_required_skills, job_show_desired_skills, job_show_competencies, job_show_benefits, job_show_development, job_show_related_jobs, job_show_share_buttons, job_show_gentia_branding, description, logo_url, job_video_url, job_use_custom_color, job_primary_color, primary_color")
        .eq("account_id", jobData.account_id)
        .maybeSingle();

      // Fetch related jobs (other active jobs from same company)
      let relatedJobs: RelatedJob[] = [];
      if (settingsData?.job_show_related_jobs !== false) {
        const { data: relatedData } = await supabase
          .from("recruitment_jobs")
          .select("id, title, location, work_modality")
          .eq("account_id", jobData.account_id)
          .eq("status", "active")
          .neq("id", jobId)
          .limit(4);
        relatedJobs = relatedData || [];
      }

      return {
        job: jobData as JobData,
        company: companyData,
        job_description: jobDescData,
        settings: settingsData,
        relatedJobs
      };
    },
    enabled: !!jobId,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const job = publicJobData?.job;
  const company = publicJobData?.company;
  const jobDescription = publicJobData?.job_description;
  const settings = publicJobData?.settings;
  const relatedJobs = publicJobData?.relatedJobs || [];

  // Track viewed_job event in sessionStorage for later association
  useEffect(() => {
    if (job?.id) {
      const viewedJobsKey = "gentia_viewed_jobs";
      try {
        const viewedJobs = JSON.parse(sessionStorage.getItem(viewedJobsKey) || "{}");
        if (!viewedJobs[job.id]) {
          const trackingData = getTrackingData();
          viewedJobs[job.id] = {
            jobId: job.id,
            accountId: job.account_id,
            viewedAt: new Date().toISOString(),
            source: trackingData.source,
            medium: trackingData.medium,
            campaign: trackingData.campaign,
          };
          sessionStorage.setItem(viewedJobsKey, JSON.stringify(viewedJobs));
          console.log("[Tracking] viewed_job registered:", job.id);
        }
      } catch (error) {
        console.error("[Tracking] Failed to store viewed_job:", error);
      }
    }
  }, [job?.id, job?.account_id]);

  // Default settings - show everything if no settings exist
  const showCompanySection = settings?.job_show_company_section ?? true;
  const showMission = settings?.job_show_mission ?? true;
  const showResponsibilities = settings?.job_show_responsibilities ?? true;
  const showIndicators = settings?.job_show_indicators ?? true;
  const showRequiredSkills = settings?.job_show_required_skills ?? true;
  const showDesiredSkills = settings?.job_show_desired_skills ?? true;
  const showCompetencies = settings?.job_show_competencies ?? true;
  const showBenefits = settings?.job_show_benefits ?? true;
  const showDevelopment = settings?.job_show_development ?? true;
  const showRelatedJobs = settings?.job_show_related_jobs ?? true;
  const showShareButtons = settings?.job_show_share_buttons ?? true;
  const showGentiaBranding = settings?.job_show_gentia_branding ?? true;
  
  // Color and video settings
  const videoUrl = settings?.job_video_url || null;
  const primaryColor = settings?.job_use_custom_color && settings?.job_primary_color
    ? settings.job_primary_color
    : settings?.primary_color || '#000000';

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return null;
    if (min === max || !max) {
      return `R$ ${min?.toLocaleString("pt-BR")}`;
    }
    return `R$ ${min?.toLocaleString("pt-BR")} - R$ ${max?.toLocaleString("pt-BR")}`;
  };

  // Share functions
  const handleShareLinkedIn = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`Confira esta vaga: ${job?.title} em ${company?.name}\n${window.location.href}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copiado!");
  };

  // Invalid / truncated link — short-circuit before loading
  if (isInvalidLink) {
    console.warn("[PublicJobPage] Invalid jobId in URL", { rawJobId });
    return <JobLookupError kind="invalid_link" />;
  }

  // Loading state for job data or user type check
  if (isLoading || isLoadingUserType) {
    return (
      <div className="min-h-screen bg-muted/30">
        {/* Loading header skeleton */}
        <header className="border-b border-border bg-background sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <Skeleton className="h-8 w-24" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
          </div>
        </header>

        {/* Loading content */}
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error("[PublicJobPage] Error:", error);
  }

  if (!job) {
    return <JobLookupError kind="not_found" />;
  }

  // Job exists but is not active anymore
  if (job.status !== "active") {
    console.warn("[PublicJobPage] Job inactive", { jobId, status: job.status });
    return (
      <JobLookupError
        kind="job_closed"
        careersSlug={company?.slug ?? null}
        companyName={company?.name ?? null}
      />
    );
  }

  const salary = !job.hide_salary ? formatSalary(job.budget_min, job.budget_max) : null;

  const handleApplyClick = async () => {
    if (user) {
      // Any logged-in user can apply, even if they're also a member of
      // another organization. The application is created on the job's
      // owner account, not on the user's org.
      navigate(`/candidato/aplicar/${jobId}`);
      return;
    }

    // Not logged in - show auth modal
    setAuthModalOpen(true);
  };


  const handleAuthSuccess = async (isNewAccount?: boolean) => {
    setAuthModalOpen(false);
    if (isNewAccount) {
      // New account - redirect to biography page first, with job ID
      navigate(`/candidato/biografia?vaga=${jobId}`);
    } else {
      // Existing account - navigate directly to application page
      navigate(`/candidato/aplicar/${jobId}`);
    }
  };

  // Get candidate display data for navbar
  const candidateUserData = {
    email: user?.email,
    firstName: candidateProfile?.full_name?.split(" ")[0],
    lastName: candidateProfile?.full_name?.split(" ").slice(1).join(" "),
  };

  const careersPageUrl = company?.slug ? `/careers/${company.slug}` : `/careers/${company?.id}`;

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* SEO Schema.org JobPosting for Google Jobs */}
      <JobSEOHead 
        job={{
          id: job.id,
          title: job.title,
          description: job.description,
          location: job.location,
          work_modality: job.work_modality,
          work_regime: job.work_regime,
          budget_min: job.budget_min,
          budget_max: job.budget_max,
          hide_salary: job.hide_salary,
          created_at: job.created_at,
          department: job.department,
        }}
        company={company ? { name: company.name, website: null } : null}
        logoUrl={settings?.logo_url}
        mission={jobDescription?.mission}
        jobDescription={jobDescription ? {
          mission: jobDescription.mission,
          responsibilities: jobDescription.responsibilities,
          required_skills: jobDescription.required_skills,
          desired_skills: jobDescription.desired_skills,
          behavioral_competencies: jobDescription.behavioral_competencies,
          benefits: jobDescription.benefits,
          development: jobDescription.development,
          indicators: jobDescription.indicators,
        } : null}
      />

      {/* Candidate Navbar - Show only for logged-in candidates */}
      {isCandidate && <CandidateNavbar user={candidateUserData} />}



      <CandidateAuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        onSuccess={handleAuthSuccess}
        jobTitle={job.title}
        jobId={jobId}
        accountId={job.account_id}
      />

      {/* Header with Navigation and Share */}
      <header className="border-b border-border bg-background sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate(careersPageUrl)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Ver todas as vagas
          </Button>
          
          {showShareButtons && (
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleShareLinkedIn}
                title="Compartilhar no LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleShareWhatsApp}
                title="Compartilhar no WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleCopyLink}
                title="Copiar link"
              >
                <Link2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 flex-1">
        {/* Video Section */}
        {videoUrl && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Play className="h-5 w-5" style={{ color: primaryColor }} />
                Vídeo de Apresentação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                {videoUrl.includes('youtube') || videoUrl.includes('youtu.be') ? (
                  <iframe
                    src={videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : videoUrl.includes('vimeo') ? (
                  <iframe
                    src={videoUrl.replace('vimeo.com/', 'player.vimeo.com/video/')}
                    className="w-full h-full"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* About Company Section */}
        {showCompanySection && company && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5" style={{ color: primaryColor }} />
                Sobre a {company.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                {settings?.logo_url ? (
                  <img 
                    src={settings.logo_url} 
                    alt={company.name}
                    className="h-16 w-16 rounded-lg object-contain bg-muted"
                  />
                ) : (
                  <div 
                    className="h-16 w-16 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${primaryColor}15` }}
                  >
                    <Building2 className="h-8 w-8" style={{ color: primaryColor }} />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{company.name}</h3>
                  {settings?.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                      {settings.description}
                    </p>
                  )}
                  <Button 
                    variant="link" 
                    className="p-0 h-auto" 
                    style={{ color: primaryColor }}
                    asChild
                  >
                    <Link to={careersPageUrl} className="flex items-center gap-1">
                      Conheça mais sobre a empresa
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Job Title Section */}
        <div className="mb-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Briefcase className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              {company?.name && !showCompanySection && (
                <p className="text-sm font-medium text-primary mb-1">{company.name}</p>
              )}
              <h1 className="text-2xl font-bold">{job.title}</h1>
            </div>
            <Button 
              size="lg" 
              className="shrink-0"
              onClick={handleApplyClick}
            >
              Me candidatar
            </Button>
          </div>
          
          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {job.location && (
              <Badge variant="secondary" className="gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {job.location}
              </Badge>
            )}
            {job.work_regime && (
              <Badge variant="secondary" className="gap-1.5">
                <Briefcase className="h-3.5 w-3.5" />
                {WORK_REGIME_LABELS[job.work_regime] || job.work_regime}
              </Badge>
            )}
            {job.work_modality && (
              <Badge variant="secondary" className="gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {WORK_MODALITY_LABELS[job.work_modality] || job.work_modality}
              </Badge>
            )}
            {(jobDescription?.area || job.department) && (
              <Badge variant="outline" className="gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {jobDescription?.area || job.department}
              </Badge>
            )}
            {salary && (
              <Badge variant="outline" className="gap-1.5 bg-green-500/10 text-green-700 border-green-500/20">
                <DollarSign className="h-3.5 w-3.5" />
                {salary}
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Mission */}
          {showMission && jobDescription?.mission && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5 text-primary" />
                  Missão do Cargo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {jobDescription.mission}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Responsibilities */}
          {showResponsibilities && jobDescription?.responsibilities && jobDescription.responsibilities.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Responsabilidades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {jobDescription.responsibilities.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Indicators */}
          {showIndicators && jobDescription?.indicators && jobDescription.indicators.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Indicadores de Sucesso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {jobDescription.indicators.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Required Skills */}
          {showRequiredSkills && jobDescription?.required_skills && jobDescription.required_skills.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Requisitos Obrigatórios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {jobDescription.required_skills.map((skill, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                      <span className="text-muted-foreground">{skill}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Desired Skills */}
          {showDesiredSkills && jobDescription?.desired_skills && jobDescription.desired_skills.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Star className="h-5 w-5 text-primary" />
                  Diferenciais
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {jobDescription.desired_skills.map((skill, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="h-2 w-2 rounded-full bg-primary/60 mt-2 shrink-0" />
                      <span className="text-muted-foreground">{skill}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Behavioral Competencies */}
          {showCompetencies && jobDescription?.behavioral_competencies && jobDescription.behavioral_competencies.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-primary" />
                  Competências Comportamentais
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {jobDescription.behavioral_competencies.map((comp, idx) => (
                    <Badge key={idx} variant="secondary" className="py-1.5">
                      {comp}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Benefits */}
          {showBenefits && jobDescription?.benefits && jobDescription.benefits.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Gift className="h-5 w-5 text-primary" />
                  Benefícios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {jobDescription.benefits.map((benefit, idx) => (
                    <Badge key={idx} variant="outline" className="py-1.5 bg-green-50 text-green-700 border-green-200">
                      {benefit}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Development */}
          {showDevelopment && jobDescription?.development && jobDescription.development.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Oportunidades de Desenvolvimento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {jobDescription.development.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Additional Info */}
          {job.additional_info && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertCircle className="h-5 w-5 text-primary" />
                  Informações Adicionais
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {job.additional_info}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Apply CTA */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-8 text-center">
              <h3 className="text-xl font-semibold mb-2">Interessado nesta vaga?</h3>
              <p className="text-muted-foreground mb-4">
                Candidate-se agora e dê o próximo passo na sua carreira!
              </p>
              <Button size="lg" onClick={handleApplyClick}>
                Me candidatar
              </Button>
            </CardContent>
          </Card>

          {/* Related Jobs */}
          {showRelatedJobs && relatedJobs.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Briefcase className="h-5 w-5 text-primary" />
                  Outras Vagas em {company?.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {relatedJobs.map((relatedJob) => (
                    <Link 
                      key={relatedJob.id} 
                      to={`/vagas/${relatedJob.id}`}
                      className="block p-4 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                            {relatedJob.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {relatedJob.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {relatedJob.location}
                              </span>
                            )}
                            {relatedJob.work_modality && (
                              <Badge variant="secondary" className="text-xs py-0 px-1.5">
                                {WORK_MODALITY_LABELS[relatedJob.work_modality] || relatedJob.work_modality}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={careersPageUrl}>
                      Ver todas as vagas
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Footer with GENTIA Branding */}
      {showGentiaBranding && (
        <footer className="border-t border-border py-6 mt-8 bg-background">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs text-muted-foreground">Powered by</span>
              <a 
                href="https://gentia.lovable.app" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
              >
                <img 
                  src={logoGentia} 
                  alt="GENT.IA" 
                  className="h-5 w-auto"
                />
              </a>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
