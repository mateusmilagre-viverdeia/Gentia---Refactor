import { useParams, useNavigate } from "react-router-dom";
import { RecruitmentLayout } from "@/components/layout/RecruitmentLayout";
import { useClient, useClientStats } from "@/hooks/useClients";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, ArrowLeft, Edit, Plus, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate as useNav } from "react-router-dom";
import { useState } from "react";
import { ClientFormDialog } from "@/components/recruitment/clients/ClientFormDialog";
import { ClientOverviewTab } from "@/components/recruitment/clients/ClientOverviewTab";
import { ClientJobsTab } from "@/components/recruitment/clients/ClientJobsTab";
import { ClientFinancialTab } from "@/components/recruitment/clients/ClientFinancialTab";
import { ClientPortalTab } from "@/components/recruitment/clients/ClientPortalTab";
import { ClientHistoryTab } from "@/components/recruitment/clients/ClientHistoryTab";
import { ClientGarantiasTab } from "@/components/recruitment/clients/ClientGarantiasTab";
import { ClientCareerPageTab } from "@/components/recruitment/clients/ClientCareerPageTab";


const statusColors: Record<string, string> = {
  ativo: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  inativo: "bg-muted text-muted-foreground",
  prospect: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
};

export default function ClientDetailsPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { data: client, isLoading } = useClient(clientId);
  const { data: stats } = useClientStats(clientId);
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <RecruitmentLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando...</div>
      </RecruitmentLayout>
    );
  }

  if (!client) {
    return (
      <RecruitmentLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Cliente não encontrado</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/atracao-contratacao/recrutamento/clientes")}>
            Voltar
          </Button>
        </div>
      </RecruitmentLayout>
    );
  }

  return (
    <RecruitmentLayout>
      <div className="space-y-6">
        {/* Back + Header */}
        <Button variant="ghost" size="sm" onClick={() => navigate("/atracao-contratacao/recrutamento/clientes")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              {client.logo_url ? (
                <img src={client.logo_url} alt="" className="w-14 h-14 rounded-xl object-cover" />
              ) : (
                <Building2 className="h-7 w-7 text-primary" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{client.nome_fantasia || client.razao_social}</h1>
                <Badge variant="secondary" className={statusColors[client.status] || ""}>
                  {client.status}
                </Badge>
              </div>
              {client.nome_fantasia && (
                <p className="text-sm text-muted-foreground">{client.razao_social}</p>
              )}
              <p className="text-sm text-muted-foreground">
                {[client.setor, client.porte].filter(Boolean).join(" · ") || "Sem informações adicionais"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                supabase
                  .from("portal_clientes_acesso")
                  .select("token_acesso")
                  .eq("cliente_id", client.id)
                  .eq("ativo", true)
                  .limit(1)
                  .maybeSingle()
                  .then(({ data }) => {
                    if (data?.token_acesso) {
                      window.open(`${window.location.origin}/portal/${data.token_acesso}`, "_blank");
                    } else {
                      toast.info("Nenhum acesso ao portal configurado. Crie um na aba Portal.");
                    }
                  });
              }}
            >
              <Globe className="h-4 w-4 mr-2" />
              Abrir Portal
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/atracao-contratacao/recrutamento/jobs/new?clienteId=${client.id}`)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Vaga
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="jobs">Vagas</TabsTrigger>
            <TabsTrigger value="financial">Financeiro</TabsTrigger>
            <TabsTrigger value="garantias">Garantias</TabsTrigger>
            <TabsTrigger value="portal">Portal</TabsTrigger>
            <TabsTrigger value="careers">Página de Carreiras</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ClientOverviewTab client={client} stats={stats} />
          </TabsContent>
          <TabsContent value="jobs">
            <ClientJobsTab clientId={client.id} />
          </TabsContent>
          <TabsContent value="financial">
            <ClientFinancialTab clientId={client.id} />
          </TabsContent>
          <TabsContent value="garantias">
            <ClientGarantiasTab clientId={client.id} />
          </TabsContent>
          <TabsContent value="portal">
            <ClientPortalTab client={client} />
          </TabsContent>
          <TabsContent value="careers">
            <ClientCareerPageTab client={client} />
          </TabsContent>
          <TabsContent value="history">
            <ClientHistoryTab clientId={client.id} />
          </TabsContent>
        </Tabs>
      </div>

      <ClientFormDialog open={editOpen} onOpenChange={setEditOpen} client={client} />
    </RecruitmentLayout>
  );
}
