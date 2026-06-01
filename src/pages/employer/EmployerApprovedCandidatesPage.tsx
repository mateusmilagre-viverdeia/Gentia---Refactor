import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { EmployerLayout } from "@/components/layout/EmployerLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users } from "lucide-react";
import { parseISO } from "date-fns";
import { formatBRT } from "@/lib/datetime";

function getStatusLabel(status?: string) {
  if (status === "hired") return "Contratado";
  if (status === "approved") return "Aprovado pelo cliente";
  return "Shortlist";
}

function getEmptyMessage(jobFilter: string, statusFilter: string) {
  if (jobFilter !== "all") return "Nenhum candidato aprovado para a vaga selecionada.";
  if (statusFilter !== "all") return "Nenhum candidato encontrado com este status.";
  return "Nenhum candidato aprovado ainda.";
}

export default function EmployerApprovedCandidatesPage() {
  const { account } = useAccount();
  const linkedClientId = (account as any)?.employer_linked_client_id;
  const linkedAgencyId = (account as any)?.employer_linked_agency_id;
  const [jobFilter, setJobFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: applications = [], isLoading, isError } = useQuery({
    queryKey: ["employer-approved", linkedClientId, linkedAgencyId],
    enabled: !!linkedClientId && !!linkedAgencyId,
    queryFn: async () => {
      const { data: jobs, error: jobsError } = await supabase
        .from("recruitment_jobs")
        .select("id, title")
        .eq("account_id", linkedAgencyId)
        .eq("cliente_id", linkedClientId);
      if (jobsError) throw jobsError;
      const jobIds = (jobs || []).map((j) => j.id);
      const jobMap: Record<string, string> = {};
      (jobs || []).forEach((j) => (jobMap[j.id] = j.title));
      if (jobIds.length === 0) return [];

      const { data: apps, error: appsError } = await supabase
        .from("recruitment_applications")
        .select("id, status, applied_at, updated_at, job_id, candidate_id, score")
        .in("job_id", jobIds)
        .in("status", ["shortlisted", "approved", "hired"])
        .order("updated_at", { ascending: false });
      if (appsError) throw appsError;

      const candIds = Array.from(new Set((apps || []).map((a) => a.candidate_id)));
      const { data: cands, error: candsError } = await supabase
        .from("recruitment_candidates")
        .select("id, first_name, last_name, linkedin_url")
        .in("id", candIds.length ? candIds : ["00000000-0000-0000-0000-000000000000"]);
      if (candsError) throw candsError;
      const candMap: Record<string, any> = {};
      ((cands || []) as any[]).forEach((c) => {
        candMap[c.id] = {
          id: c.id,
          name: [c.first_name, c.last_name].filter(Boolean).join(" ") || "—",
          current_role: c.linkedin_url ? "Perfil LinkedIn disponível" : "Não informado",
        };
      });

      return (apps || []).map((a) => ({ ...a, candidate: candMap[a.candidate_id], job_title: jobMap[a.job_id] }));
    },
  });

  const jobs = useMemo(() => {
    const map = new Map<string, string>();
    applications.forEach((a: any) => map.set(a.job_id, a.job_title || "Processo"));
    return Array.from(map.entries());
  }, [applications]);

  const filteredApplications = applications.filter((a: any) => {
    const matchesJob = jobFilter === "all" || a.job_id === jobFilter;
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    return matchesJob && matchesStatus;
  });

  return (
    <EmployerLayout>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Candidatos Aprovados</h1>
          <p className="text-sm text-muted-foreground">Candidatos que chegaram à shortlist dos seus processos</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full max-w-md" />
            {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-16" />)}
          </div>
        ) : isError ? (
          <Alert><AlertDescription>Não foi possível carregar os candidatos agora. Tente novamente em instantes.</AlertDescription></Alert>
        ) : applications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhum candidato aprovado ainda.</p>
              <p className="mt-1 text-sm text-muted-foreground">Candidatos em shortlist, aprovados ou contratados aparecerão aqui.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Select value={jobFilter} onValueChange={setJobFilter}>
                <SelectTrigger><SelectValue placeholder="Filtrar por vaga" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as vagas</SelectItem>
                  {jobs.map(([id, title]) => <SelectItem key={id} value={id}>{title}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="Filtrar por status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="shortlisted">Shortlist</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="hired">Contratado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredApplications.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">{getEmptyMessage(jobFilter, statusFilter)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros para consultar outros candidatos em shortlist, aprovados ou contratados.</p>
                </CardContent>
              </Card>
            ) : (
              <>
            <div className="grid gap-3 md:hidden">
              {filteredApplications.map((a: any) => (
                <Card key={a.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{a.candidate?.name || "—"}</p>
                        <p className="text-sm text-muted-foreground">{a.job_title || "Processo"}</p>
                      </div>
                      <Badge variant={a.status === "hired" ? "default" : "secondary"}>{getStatusLabel(a.status)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{a.candidate?.current_role || "Não informado"}</p>
                    <p className="text-xs text-muted-foreground">Aprovação em {formatBRT(parseISO(a.updated_at), "dd/MM/yyyy")}{typeof a.score === "number" ? ` · Score ${Math.round(a.score)}%` : ""}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="hidden md:block">
              <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Nome</th>
                      <th className="text-left p-3 font-medium">Cargo atual</th>
                      <th className="text-left p-3 font-medium">Vaga</th>
                      <th className="text-left p-3 font-medium">Data aprovação</th>
                      <th className="text-left p-3 font-medium">Score</th>
                      <th className="text-left p-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplications.map((a: any) => (
                      <tr key={a.id} className="border-b last:border-0">
                        <td className="p-3 font-medium">{a.candidate?.name || "—"}</td>
                        <td className="p-3 text-muted-foreground">{a.candidate?.current_role || "Não informado"}</td>
                        <td className="p-3">{a.job_title}</td>
                        <td className="p-3 text-muted-foreground">
                          {formatBRT(parseISO(a.updated_at), "dd/MM/yyyy")}
                        </td>
                        <td className="p-3 text-muted-foreground">{typeof a.score === "number" ? `${Math.round(a.score)}%` : "—"}</td>
                        <td className="p-3">
                          <Badge variant={a.status === "hired" ? "default" : "secondary"}>
                            {getStatusLabel(a.status)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
              </>
            )}
          </div>
        )}
      </div>
    </EmployerLayout>
  );
}
