import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  BarChart3, 
  Users,
  Send,
  CheckCircle,
  MessageCircle,
  TrendingUp,
  XCircle,
  Clock,
  Loader2,
  RefreshCw
} from "lucide-react";
import { OutreachCampaign, useOutreachCampaigns, useOutreachConversations } from "@/hooks/useOutreachCampaigns";
import { OutreachConversationTimeline } from "./OutreachConversationTimeline";
import { formatBRTRelative } from "@/lib/datetime";


interface Props {
  campaign: OutreachCampaign;
  onBack: () => void;
}

const statusColors: Record<string, string> = {
  queued: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  delivered: "bg-blue-100 text-blue-700",
  responded: "bg-green-100 text-green-700",
  interested: "bg-emerald-100 text-emerald-700",
  not_interested: "bg-orange-100 text-orange-700",
  converted: "bg-purple-100 text-purple-700",
  opted_out: "bg-red-100 text-red-700",
  failed: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  queued: "Na Fila",
  sent: "Enviada",
  delivered: "Entregue",
  responded: "Respondeu",
  interested: "Interessado",
  not_interested: "Sem Interesse",
  converted: "Convertido",
  opted_out: "Opt-out",
  failed: "Falhou",
};

export function OutreachCampaignDashboard({ campaign, onBack }: Props) {
  const { startCampaign, pauseCampaign, resumeCampaign, fetchCampaigns, processQueue } = useOutreachCampaigns();
  const { conversations, isLoading: conversationsLoading, fetchConversations } = useOutreachConversations(campaign.id);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  const handleAction = async (action: () => Promise<boolean>) => {
    setIsActionLoading(true);
    try {
      await action();
      await fetchCampaigns();
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleProcessQueue = async () => {
    setIsProcessingQueue(true);
    try {
      await processQueue();
      await fetchConversations();
    } finally {
      setIsProcessingQueue(false);
    }
  };

  const filteredConversations = conversations.filter(c => {
    if (activeTab === "all") return true;
    if (activeTab === "responded") return ["responded", "interested", "not_interested"].includes(c.status);
    if (activeTab === "interested") return c.status === "interested";
    if (activeTab === "converted") return c.status === "converted";
    return true;
  });

  const selectedConv = selectedConversation 
    ? conversations.find(c => c.id === selectedConversation) 
    : null;

  // Metrics
  const totalContacts = campaign.contacts_queued || 0;
  const sent = campaign.contacts_sent || 0;
  const responses = campaign.responses_received || 0;
  const interested = campaign.interested_count || 0;
  const converted = campaign.converted_count || 0;

  const responseRate = sent > 0 ? ((responses / sent) * 100).toFixed(1) : "0";
  const interestRate = responses > 0 ? ((interested / responses) * 100).toFixed(1) : "0";
  const conversionRate = interested > 0 ? ((converted / interested) * 100).toFixed(1) : "0";
  const progress = totalContacts > 0 ? (sent / totalContacts) * 100 : 0;

  if (selectedConv) {
    return (
      <OutreachConversationTimeline
        conversation={selectedConv}
        onBack={() => {
          setSelectedConversation(null);
          fetchConversations();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{campaign.name}</h1>
              <Badge variant={campaign.status === "running" ? "default" : "secondary"}>
                {campaign.status === "running" ? "Em Execução" : 
                 campaign.status === "paused" ? "Pausada" :
                 campaign.status === "completed" ? "Concluída" :
                 campaign.status === "draft" ? "Rascunho" : campaign.status}
              </Badge>
            </div>
            {campaign.description && (
              <p className="text-muted-foreground">{campaign.description}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {/* Process Queue Button - visible when campaign is running */}
          {(campaign.status === "running" || campaign.status === "paused") && (totalContacts - sent) > 0 && (
            <Button
              variant="outline"
              onClick={handleProcessQueue}
              disabled={isProcessingQueue}
            >
              {isProcessingQueue ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Processar Fila
            </Button>
          )}

          {campaign.status === "draft" && (
            <Button 
              onClick={() => handleAction(() => startCampaign(campaign.id))}
              disabled={isActionLoading}
            >
              {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              Iniciar Campanha
            </Button>
          )}
          {campaign.status === "running" && (
            <Button 
              variant="outline"
              onClick={() => handleAction(() => pauseCampaign(campaign.id))}
              disabled={isActionLoading}
            >
              {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
              Pausar
            </Button>
          )}
          {campaign.status === "paused" && (
            <Button 
              onClick={() => handleAction(() => resumeCampaign(campaign.id))}
              disabled={isActionLoading}
            >
              {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              Retomar
            </Button>
          )}
        </div>
      </div>

      {/* Progress */}
      {campaign.status !== "draft" && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progresso de Envio</span>
              <span className="text-sm text-muted-foreground">{sent} / {totalContacts}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Na Fila</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-2xl font-bold">{totalContacts - sent}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Enviadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-blue-500" />
              <span className="text-2xl font-bold">{sent}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Respostas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold">{responses}</span>
            </div>
            <p className="text-xs text-muted-foreground">{responseRate}% taxa</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Interessados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-2xl font-bold">{interested}</span>
            </div>
            <p className="text-xs text-muted-foreground">{interestRate}% das respostas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Convertidos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-purple-500" />
              <span className="text-2xl font-bold">{converted}</span>
            </div>
            <p className="text-xs text-muted-foreground">{conversionRate}% conversão</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Opt-outs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-2xl font-bold">
                {conversations.filter(c => c.status === "opted_out").length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Conversas
          </CardTitle>
          <CardDescription>
            Histórico de interações com os candidatos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">Todas ({conversations.length})</TabsTrigger>
              <TabsTrigger value="responded">Responderam ({conversations.filter(c => ["responded", "interested", "not_interested"].includes(c.status)).length})</TabsTrigger>
              <TabsTrigger value="interested">Interessados ({conversations.filter(c => c.status === "interested").length})</TabsTrigger>
              <TabsTrigger value="converted">Convertidos ({conversations.filter(c => c.status === "converted").length})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {conversationsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Carregando conversas...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma conversa encontrada
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredConversations.map((conv) => (
                    <div
                      key={conv.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedConversation(conv.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{conv.contact_name}</span>
                          <Badge className={statusColors[conv.status] || "bg-gray-100 text-gray-700"}>
                            {statusLabels[conv.status] || conv.status}
                          </Badge>
                          {conv.interest_score !== null && conv.interest_score >= 70 && (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                              Score: {conv.interest_score}%
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {conv.contact_phone}
                          {conv.last_message_at && (
                            <span className="ml-2">
                              • Última mensagem {formatBRTRelative(new Date(conv.last_message_at))}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{(conv.messages || []).length} mensagens</span>
                        <MessageCircle className="h-4 w-4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
