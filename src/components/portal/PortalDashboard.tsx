import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Users, History } from "lucide-react";
import { PortalJobCard } from "./PortalJobCard";
import { PortalCandidatesTab } from "./PortalCandidatesTab";
import { PortalHistoryTab } from "./PortalHistoryTab";
import { usePortalCandidates, usePortalFeedbacks } from "@/hooks/usePortalData";
import { usePortalJobsRealtime } from "@/hooks/usePortalJobsRealtime";
import type { PortalAuthData } from "@/hooks/usePortalAuth";
import { Skeleton } from "@/components/ui/skeleton";

interface PortalDashboardProps {
  auth: PortalAuthData;
  onViewShortlist: (jobId: string, jobTitle: string) => void;
}

export function PortalDashboard({ auth, onViewShortlist }: PortalDashboardProps) {
  const [tab, setTab] = useState("vagas");
  const { data: jobs = [], isLoading: loadingJobs } = usePortalJobsRealtime(auth.client.id, auth.accountId);
  const { data: candidates = [], isLoading: loadingCandidates } = usePortalCandidates(auth.client.id);
  const { data: feedbacks = [] } = usePortalFeedbacks(auth.client.id);

  const activeJobs = jobs.filter((j: any) => j.status === "active");
  const token = auth.access.token_acesso;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Painel do Cliente</h2>
        <p className="text-muted-foreground">Acompanhe suas vagas e candidatos</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="vagas" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Vagas Abertas ({activeJobs.length})
          </TabsTrigger>
          <TabsTrigger value="candidatos" className="gap-2">
            <Users className="h-4 w-4" />
            Candidatos
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vagas" className="mt-6">
          {loadingJobs ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
          ) : activeJobs.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">Nenhuma vaga aberta</h3>
              <p className="text-muted-foreground">Não há vagas ativas no momento.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {activeJobs.map((job: any) => (
                <PortalJobCard
                  key={job.id}
                  job={job}
                  token={token}
                  onViewShortlist={() => onViewShortlist(job.id, job.title)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="candidatos" className="mt-6">
          <PortalCandidatesTab
            candidates={candidates}
            feedbacks={feedbacks}
            isLoading={loadingCandidates}
          />
        </TabsContent>

        <TabsContent value="historico" className="mt-6">
          <PortalHistoryTab token={token} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
