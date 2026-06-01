import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  TrendingUp,
  Star,
  Linkedin,
  MessageCircle,
  Link2,
  ArrowRight,
  Play
} from "lucide-react";
import { cn } from "@/lib/utils";
import logoGentia from "@/assets/logo-gentia-black.png";

interface JobPagePreviewProps {
  companyName: string;
  logoUrl: string | null;
  companyDescription: string;
  primaryColor: string;
  jobPrimaryColor: string;
  useJobCustomColor: boolean;
  videoUrl: string | null;
  settings: {
    job_show_company_section: boolean;
    job_show_mission: boolean;
    job_show_responsibilities: boolean;
    job_show_indicators: boolean;
    job_show_required_skills: boolean;
    job_show_desired_skills: boolean;
    job_show_competencies: boolean;
    job_show_benefits: boolean;
    job_show_development: boolean;
    job_show_related_jobs: boolean;
    job_show_share_buttons: boolean;
    job_show_gentia_branding: boolean;
  };
  className?: string;
}

// Mock data for preview
const mockJob = {
  title: "Desenvolvedor Full Stack",
  location: "São Paulo, SP",
  work_modality: "Híbrido",
  employment_type: "CLT",
  budget_min: 8000,
  budget_max: 12000,
};

const mockJobDescription = {
  mission: "Desenvolver e manter aplicações web de alta qualidade para nossos clientes.",
  responsibilities: ["Desenvolver novas funcionalidades", "Revisar código", "Escrever testes"],
  required_skills: ["React", "TypeScript", "Node.js"],
  desired_skills: ["GraphQL", "AWS", "Docker"],
  behavioral_competencies: ["Comunicação", "Proatividade", "Trabalho em equipe"],
  benefits: ["Vale refeição", "Plano de saúde", "Home office"],
  development: ["Cursos", "Mentoria"],
  indicators: ["Entregas no prazo", "Qualidade do código"],
};

const mockRelatedJobs = [
  { id: "1", title: "Designer UX/UI", location: "Remoto", work_modality: "Remoto" },
  { id: "2", title: "Analista de Marketing", location: "Rio de Janeiro", work_modality: "Presencial" },
];

export function JobPagePreview({
  companyName,
  logoUrl,
  companyDescription,
  primaryColor,
  jobPrimaryColor,
  useJobCustomColor,
  videoUrl,
  settings,
  className,
}: JobPagePreviewProps) {
  // Use job-specific color if enabled, otherwise use company color
  const activeColor = useJobCustomColor ? jobPrimaryColor : primaryColor;

  const formatSalary = (min: number, max: number) => {
    return `R$ ${min.toLocaleString("pt-BR")} - R$ ${max.toLocaleString("pt-BR")}`;
  };

  return (
    <div className={cn("bg-background border rounded-lg overflow-hidden shadow-sm", className)}>
      {/* Scale wrapper for miniature preview */}
      <div className="origin-top-left" style={{ transform: "scale(0.6)", width: "166.67%", height: "auto" }}>
        {/* Header with Navigation */}
        <header className="border-b border-border bg-background sticky top-0 z-40">
          <div className="px-4 py-2 flex items-center justify-between">
            <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3 w-3" />
              Ver todas as vagas
            </button>
            
            {settings.job_show_share_buttons && (
              <div className="flex items-center gap-1">
                <button className="p-1 rounded hover:bg-muted">
                  <Linkedin className="h-3 w-3 text-muted-foreground" />
                </button>
                <button className="p-1 rounded hover:bg-muted">
                  <MessageCircle className="h-3 w-3 text-muted-foreground" />
                </button>
                <button className="p-1 rounded hover:bg-muted">
                  <Link2 className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Job Header Card */}
        <div className="p-4">
          <Card className="border-2" style={{ borderColor: activeColor }}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h1 className="font-bold text-base mb-1">{mockJob.title}</h1>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" />
                      {mockJob.location}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Briefcase className="h-3 w-3" />
                      {mockJob.work_modality}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                    {mockJob.employment_type}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-medium flex items-center gap-1" style={{ color: activeColor }}>
                  <DollarSign className="h-3 w-3" />
                  {formatSalary(mockJob.budget_min, mockJob.budget_max)}
                </span>
              </div>

              <Button 
                size="sm" 
                className="w-full mt-3 text-xs h-7"
                style={{ backgroundColor: activeColor }}
              >
                Candidatar-se
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Video Section */}
        {videoUrl && (
          <div className="px-4 pb-3">
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs flex items-center gap-1">
                  <Play className="h-3 w-3" style={{ color: activeColor }} />
                  Vídeo de Apresentação
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                  <Play className="h-6 w-6 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* About Company Section */}
        {settings.job_show_company_section && (
          <div className="px-4 pb-3">
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs flex items-center gap-1">
                  <Building2 className="h-3 w-3" style={{ color: activeColor }} />
                  Sobre a {companyName}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="flex items-start gap-2">
                  {logoUrl ? (
                    <img 
                      src={logoUrl} 
                      alt={companyName}
                      className="h-8 w-8 rounded-md object-contain bg-muted"
                    />
                  ) : (
                    <div 
                      className="h-8 w-8 rounded-md flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: activeColor }}
                    >
                      {companyName.charAt(0)}
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground line-clamp-2 flex-1">
                    {companyDescription || `Conheça mais sobre a ${companyName} e nossas oportunidades.`}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Job Sections */}
        <div className="px-4 space-y-3 pb-4">
          {settings.job_show_mission && mockJobDescription.mission && (
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs flex items-center gap-1">
                  <Target className="h-3 w-3" style={{ color: activeColor }} />
                  Missão do Cargo
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2">
                <p className="text-[10px] text-muted-foreground line-clamp-2">
                  {mockJobDescription.mission}
                </p>
              </CardContent>
            </Card>
          )}

          {settings.job_show_responsibilities && mockJobDescription.responsibilities.length > 0 && (
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" style={{ color: activeColor }} />
                  Responsabilidades
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2">
                <ul className="space-y-0.5">
                  {mockJobDescription.responsibilities.slice(0, 2).map((item, i) => (
                    <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1">
                      <span style={{ color: activeColor }}>•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {settings.job_show_indicators && mockJobDescription.indicators.length > 0 && (
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" style={{ color: activeColor }} />
                  Indicadores de Sucesso
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2">
                <ul className="space-y-0.5">
                  {mockJobDescription.indicators.slice(0, 2).map((item, i) => (
                    <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1">
                      <span style={{ color: activeColor }}>•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {settings.job_show_required_skills && mockJobDescription.required_skills.length > 0 && (
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs flex items-center gap-1">
                  <BookOpen className="h-3 w-3" style={{ color: activeColor }} />
                  Requisitos
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2">
                <div className="flex flex-wrap gap-1">
                  {mockJobDescription.required_skills.map((skill, i) => (
                    <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {settings.job_show_desired_skills && mockJobDescription.desired_skills.length > 0 && (
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs flex items-center gap-1">
                  <Star className="h-3 w-3" style={{ color: activeColor }} />
                  Diferenciais
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2">
                <div className="flex flex-wrap gap-1">
                  {mockJobDescription.desired_skills.map((skill, i) => (
                    <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {settings.job_show_competencies && mockJobDescription.behavioral_competencies.length > 0 && (
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs flex items-center gap-1">
                  <Users className="h-3 w-3" style={{ color: activeColor }} />
                  Competências
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2">
                <div className="flex flex-wrap gap-1">
                  {mockJobDescription.behavioral_competencies.map((comp, i) => (
                    <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0">
                      {comp}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {settings.job_show_benefits && mockJobDescription.benefits.length > 0 && (
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs flex items-center gap-1">
                  <Gift className="h-3 w-3" style={{ color: activeColor }} />
                  Benefícios
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2">
                <div className="flex flex-wrap gap-1">
                  {mockJobDescription.benefits.map((benefit, i) => (
                    <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0" style={{ borderColor: activeColor, color: activeColor }}>
                      {benefit}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {settings.job_show_development && mockJobDescription.development.length > 0 && (
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" style={{ color: activeColor }} />
                  Desenvolvimento
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2">
                <div className="flex flex-wrap gap-1">
                  {mockJobDescription.development.map((dev, i) => (
                    <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0">
                      {dev}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Related Jobs */}
        {settings.job_show_related_jobs && mockRelatedJobs.length > 0 && (
          <div className="px-4 pb-4">
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs flex items-center gap-1">
                  <Briefcase className="h-3 w-3" style={{ color: activeColor }} />
                  Outras Vagas
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2 space-y-2">
                {mockRelatedJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-1.5 rounded bg-muted/50">
                    <div>
                      <span className="text-[10px] font-medium">{job.title}</span>
                      <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                        <MapPin className="h-2.5 w-2.5" />
                        {job.location}
                      </div>
                    </div>
                    <ArrowRight className="h-3 w-3" style={{ color: activeColor }} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* GENTIA Footer */}
        {settings.job_show_gentia_branding && (
          <footer className="border-t border-border py-2 px-4">
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-[9px] text-muted-foreground">Powered by</span>
              <img src={logoGentia} alt="GENTIA" className="h-3 w-auto" />
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
