import { useState } from "react";
import { RecruitmentLayout } from "@/components/layout/RecruitmentLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageCircle, 
  Plus, 
  Play, 
  Pause, 
  BarChart3, 
  Users,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Zap
} from "lucide-react";
import { useOutreachCampaigns, OutreachCampaign } from "@/hooks/useOutreachCampaigns";
import { OutreachCampaignWizard } from "@/components/recruitment/outreach/OutreachCampaignWizard";
import { OutreachCampaignDashboard } from "@/components/recruitment/outreach/OutreachCampaignDashboard";
import { formatBRTRelative } from "@/lib/datetime";


const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ComponentType<{ className?: string }> }> = {
  draft: { label: "Rascunho", variant: "outline", icon: Clock },
  scheduled: { label: "Agendada", variant: "secondary", icon: Clock },
  running: { label: "Em Execução", variant: "default", icon: Play },
  paused: { label: "Pausada", variant: "secondary", icon: Pause },
  completed: { label: "Concluída", variant: "default", icon: CheckCircle },
  cancelled: { label: "Cancelada", variant: "destructive", icon: AlertCircle },
};

export default function OutreachPage() {
  const { campaigns, isLoading, startCampaign, pauseCampaign, resumeCampaign } = useOutreachCampaigns();
  const [showWizard, setShowWizard] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<OutreachCampaign | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  const filteredCampaigns = campaigns.filter(c => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return c.status === "running" || c.status === "scheduled";
    if (activeTab === "draft") return c.status === "draft";
    if (activeTab === "completed") return c.status === "completed" || c.status === "cancelled";
    return true;
  });

  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === "running").length,
    totalSent: campaigns.reduce((acc, c) => acc + c.contacts_sent, 0),
    totalResponses: campaigns.reduce((acc, c) => acc + c.responses_received, 0),
    totalInterested: campaigns.reduce((acc, c) => acc + c.interested_count, 0),
  };

  const responseRate = stats.totalSent > 0 ? ((stats.totalResponses / stats.totalSent) * 100).toFixed(1) : "0";

  if (selectedCampaign) {
    return (
      <RecruitmentLayout>
        <OutreachCampaignDashboard 
          campaign={selectedCampaign} 
          onBack={() => setSelectedCampaign(null)} 
        />
      </RecruitmentLayout>
    );
  }

  if (showWizard) {
    return (
      <RecruitmentLayout>
        <OutreachCampaignWizard onClose={() => setShowWizard(false)} />
      </RecruitmentLayout>
    );
  }

  return (
    <RecruitmentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageCircle className="h-6 w-6" />
              Outreach IA
            </h1>
            <p className="text-muted-foreground">
              Campanhas automatizadas de prospecção via WhatsApp com IA
            </p>
          </div>
          <Button onClick={() => setShowWizard(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Campanha
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Campanhas Ativas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-2xl font-bold">{stats.active}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Mensagens Enviadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-blue-500" />
                <span className="text-2xl font-bold">{stats.totalSent}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Respostas Recebidas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-green-500" />
                <span className="text-2xl font-bold">{stats.totalResponses}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Taxa de Resposta</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                <span className="text-2xl font-bold">{responseRate}%</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Interessados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span className="text-2xl font-bold">{stats.totalInterested}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaigns List */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">Todas ({campaigns.length})</TabsTrigger>
            <TabsTrigger value="active">Ativas ({campaigns.filter(c => c.status === "running" || c.status === "scheduled").length})</TabsTrigger>
            <TabsTrigger value="draft">Rascunhos ({campaigns.filter(c => c.status === "draft").length})</TabsTrigger>
            <TabsTrigger value="completed">Finalizadas ({campaigns.filter(c => c.status === "completed" || c.status === "cancelled").length})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Carregando campanhas...
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma campanha encontrada</h3>
                  <p className="text-muted-foreground mb-4">
                    Crie sua primeira campanha de outreach para começar a prospectar candidatos.
                  </p>
                  <Button onClick={() => setShowWizard(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Campanha
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredCampaigns.map((campaign) => {
                  const status = statusConfig[campaign.status] || statusConfig.draft;
                  const StatusIcon = status.icon;
                  
                  return (
                    <Card 
                      key={campaign.id} 
                      className="cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => setSelectedCampaign(campaign)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold">{campaign.name}</h3>
                              <Badge variant={status.variant} className="gap-1">
                                <StatusIcon className="h-3 w-3" />
                                {status.label}
                              </Badge>
                            </div>
                            {campaign.description && (
                              <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                                {campaign.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {campaign.recruitment_jobs && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {campaign.recruitment_jobs.title}
                                </span>
                              )}
                              <span>
                                Criada {formatBRTRelative(new Date(campaign.created_at))}
                              </span>
                            </div>
                          </div>

                          {/* Metrics */}
                          <div className="flex items-center gap-6 text-sm">
                            <div className="text-center">
                              <div className="font-semibold">{campaign.contacts_sent}</div>
                              <div className="text-xs text-muted-foreground">Enviadas</div>
                            </div>
                            <div className="text-center">
                              <div className="font-semibold">{campaign.responses_received}</div>
                              <div className="text-xs text-muted-foreground">Respostas</div>
                            </div>
                            <div className="text-center">
                              <div className="font-semibold text-emerald-600">{campaign.interested_count}</div>
                              <div className="text-xs text-muted-foreground">Interessados</div>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                              {campaign.status === "draft" && (
                                <Button 
                                  size="sm" 
                                  onClick={() => startCampaign(campaign.id)}
                                >
                                  <Play className="h-4 w-4 mr-1" />
                                  Iniciar
                                </Button>
                              )}
                              {campaign.status === "running" && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => pauseCampaign(campaign.id)}
                                >
                                  <Pause className="h-4 w-4 mr-1" />
                                  Pausar
                                </Button>
                              )}
                              {campaign.status === "paused" && (
                                <Button 
                                  size="sm"
                                  onClick={() => resumeCampaign(campaign.id)}
                                >
                                  <Play className="h-4 w-4 mr-1" />
                                  Retomar
                                </Button>
                              )}
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => setSelectedCampaign(campaign)}
                              >
                                <BarChart3 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </RecruitmentLayout>
  );
}
