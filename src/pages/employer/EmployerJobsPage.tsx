import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { EmployerLayout } from "@/components/layout/EmployerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Briefcase, CalendarClock, ChevronRight, FileText, Users } from "lucide-react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { formatBRT } from "@/lib/datetime";

const FUNNEL_STAGES = [
  { key: "applied", label: "Inscritos" },
  { key: "screening", label: "Triagem" },
  { key: "interview", label: "Entrevistas" },
  { key: "shortlisted", label: "Shortlist" },
  { key: "hired", label: "Contratados" },
];

function getStatusLabel(status?: string) {
  if (status === "active" || status === "open") return "Em andamento";
  if (status === "filled") return "Preenchida";
  if (status === "closed") return "Fechada";
  if (status === "paused") return "Pausada";
  return status || "Sem status";
}

function getStatusBadgeClass(status?: string) {
  if (status === "active" || status === "open") return "bg-primary text-primary-foreground hover:bg-primary/90";
  if (status === "filled") return "border-primary bg-primary/10 text-primary hover:bg-primary/15";
  if (status === "paused") return "bg-accent text-accent-foreground hover:bg-accent/90";
  if (status === "closed") return "bg-muted text-muted-foreground hover:bg-muted/90";
  return "bg-secondary text-secondary-foreground hover:bg-secondary/90";
}

function getNextStep(job: any, hasApproved: boolean) {
  if (job.report) return "Relatório disponível para análise";
  if (job.funnel_counts.hired) return "Contratação concluída; relatório será disponibilizado pela consultoria";
  if (hasApproved) return "Shortlist disponível para avaliação";
  if (job.funnel_counts.interview || job.funnel_counts.screening) return "Processo em andamento com candidatos em avaliação";
  return "Aguardando atualização da consultoria";
}

function getSla(daysLeft: number | null) {
  if (daysLeft === null) return { label: "Sem prazo", value: 0, className: "[&>div]:bg-muted-foreground" };
  if (daysLeft < 0) return { label: `${Math.abs(daysLeft)} dias em atraso`, value: 100, className: "[&>div]:bg-destructive" };
  if (daysLeft <= 3) return { label: `${daysLeft} dias restantes`, value: 85, className: "[&>div]:bg-accent" };
  return { label: `${daysLeft} dias restantes`, value: 45, className: "[&>div]:bg-primary" };
}

export default function EmployerJobsPage() {
  const { account } = useAccount();
  const navigate = useNavigate();
  const linkedClientId = (account as any)?.employer_linked_client_id;
  const linkedAgencyId = (account as any)?.employer_linked_agency_id;

  const { data: jobs = [], isLoading, isError } = useQuery({
    queryKey: ["employer-jobs", linkedClientId, linkedAgencyId],
    enabled: !!linkedClientId && !!linkedAgencyId,
    queryFn: async () => {
      const { data: jobsData, error: jobsError } = await supabase
        .from("recruitment_jobs")
        .select("id, title, status, created_at, data_limite_entrega, location, employment_type")
        .eq("account_id", linkedAgencyId)
        .eq("cliente_id", linkedClientId)
        .order("created_at", { ascending: false });
      if (jobsError) throw jobsError;
      const jobIds = (jobsData || []).map((job) => job.id);
      if (jobIds.length === 0) return [];

      const [{ data: appsData, error: appsError }, { data: reportsData, error: reportsError }] = await Promise.all([
        supabase.from("recruitment_applications").select("id, job_id, status").in("job_id", jobIds),
        supabase
          .from("process_roi_reports")
          .select("id, job_id, public_token")
          .eq("account_id", linkedAgencyId)
          .eq("client_id", linkedClientId)
          .in("job_id", jobIds),
      ]);
      if (appsError) throw appsError;
      if (reportsError) throw reportsError;

      return (jobsData || []).map((job) => {
        const apps = (appsData || []).filter((app) => app.job_id === job.id);
        const counts = apps.reduce<Record<string, number>>((acc, app) => {
          const status = app.status || "applied";
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {});
        const report = (reportsData || []).find((r) => r.job_id === job.id);
        return { ...job, applications_count: apps.length, funnel_counts: counts, report };
      });
    },
  });

  const summary = jobs.reduce(
    (acc: any, job: any) => {
      acc.active += job.status === "active" || job.status === "open" ? 1 : 0;
      acc.candidates += job.applications_count || 0;
      acc.approved += (job.funnel_counts.shortlisted || 0) + (job.funnel_counts.approved || 0) + (job.funnel_counts.hired || 0);
      acc.reports += job.report ? 1 : 0;
      return acc;
    },
    { active: 0, candidates: 0, approved: 0, reports: 0 },
  );

  return (
    <EmployerLayout>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Minhas Vagas</h1>
          <p className="text-sm text-muted-foreground">Acompanhe o andamento dos seus processos seletivos</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24" />)}
            </div>
            {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-56" />)}
          </div>
        ) : isError ? (
          <Alert><AlertDescription>Não foi possível carregar as vagas agora. Tente novamente em instantes.</AlertDescription></Alert>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhuma vaga em andamento.</p>
              <p className="mt-1 text-sm text-muted-foreground">Assim que a consultoria abrir processos para sua empresa, eles aparecerão aqui.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Vagas ativas", summary.active],
                ["Candidatos", summary.candidates],
                ["Shortlist/aprovados", summary.approved],
                ["Relatórios", summary.reports],
              ].map(([label, value]) => (
                <Card key={label as string}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-2xl font-semibold">{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            {jobs.map((job: any) => {
              const dueDate = job.data_limite_entrega ? parseISO(job.data_limite_entrega) : null;
              const daysLeft = dueDate ? differenceInCalendarDays(dueDate, new Date()) : null;
              const sla = getSla(daysLeft);
              const hasApproved = (job.funnel_counts.shortlisted || 0) + (job.funnel_counts.approved || 0) + (job.funnel_counts.hired || 0) > 0;
              const nextStep = getNextStep(job, hasApproved);
              const action = job.report
                ? { label: "Ver relatório", icon: FileText, onClick: () => window.open(`/report/${job.report.public_token}`, "_blank") }
                : hasApproved
                  ? { label: "Ver candidatos aprovados", icon: Users, onClick: () => navigate("/employer/candidates") }
                  : { label: "Aguardar atualização", icon: ChevronRight, onClick: () => undefined };

              return (
                <Card key={job.id}>
                  <CardHeader className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <CardTitle className="text-lg">{job.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {job.location || "Localização não definida"} · {job.employment_type || "Tipo não informado"} · Aberta em {formatBRT(parseISO(job.created_at), "dd/MM/yyyy")}
                        </p>
                      </div>
                      <Badge className={getStatusBadgeClass(job.status)}>
                        {getStatusLabel(job.status)}
                      </Badge>
                    </div>

                    <div className="grid gap-3 md:grid-cols-5">
                      {FUNNEL_STAGES.map((stage) => (
                        <div key={stage.key} className="rounded-md border p-3">
                          <p className="text-xs text-muted-foreground">{stage.label}</p>
                          <p className="text-xl font-semibold">{job.funnel_counts[stage.key] || 0}</p>
                        </div>
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> SLA</span>
                        <span>{sla.label}</span>
                      </div>
                      <Progress value={sla.value} className={`h-2 ${sla.className}`} />
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm"><span className="font-medium">Próximo passo:</span> {nextStep}</p>
                      <Button variant="outline" size="sm" onClick={action.onClick} disabled={!job.report && !hasApproved}>
                        <action.icon className="h-4 w-4 mr-1" /> {action.label}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </EmployerLayout>
  );
}
