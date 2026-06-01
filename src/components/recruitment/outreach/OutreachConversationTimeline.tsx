import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  Send, 
  Wand2, 
  CheckCircle, 
  XCircle,
  User,
  Bot,
  Loader2,
  Phone,
  Mail
} from "lucide-react";
import { OutreachConversation, useOutreachConversations } from "@/hooks/useOutreachCampaigns";

import { cn } from "@/lib/utils";
import { formatBRT } from "@/lib/datetime";

interface Props {
  conversation: OutreachConversation;
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

export function OutreachConversationTimeline({ conversation, onBack }: Props) {
  const { generateReply, sendManualReply, updateConversationStatus } = useOutreachConversations(conversation.campaign_id);
  const [newMessage, setNewMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const messages = conversation.messages || [];

  const handleGenerateReply = async () => {
    setIsGenerating(true);
    try {
      const reply = await generateReply(conversation.id);
      if (reply) {
        setNewMessage(reply);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    
    setIsSending(true);
    try {
      const success = await sendManualReply(conversation.id, newMessage);
      if (success) {
        setNewMessage("");
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleMarkInterested = () => updateConversationStatus(conversation.id, "interested");
  const handleMarkNotInterested = () => updateConversationStatus(conversation.id, "not_interested");
  const handleMarkConverted = () => updateConversationStatus(conversation.id, "converted");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">{conversation.contact_name}</h1>
              <Badge className={statusColors[conversation.status] || "bg-gray-100 text-gray-700"}>
                {statusLabels[conversation.status] || conversation.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {conversation.contact_phone}
              </span>
              {conversation.contact_email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {conversation.contact_email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          {conversation.status !== "converted" && conversation.status !== "opted_out" && (
            <>
              {conversation.status !== "interested" && (
                <Button size="sm" variant="outline" onClick={handleMarkInterested}>
                  <CheckCircle className="h-4 w-4 mr-1 text-emerald-500" />
                  Interessado
                </Button>
              )}
              {conversation.status !== "not_interested" && (
                <Button size="sm" variant="outline" onClick={handleMarkNotInterested}>
                  <XCircle className="h-4 w-4 mr-1 text-orange-500" />
                  Sem Interesse
                </Button>
              )}
              {conversation.status === "interested" && (
                <Button size="sm" onClick={handleMarkConverted}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Converter
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Interest Score */}
      {conversation.interest_score !== null && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Score de Interesse:</span>
                <Badge 
                  variant={conversation.interest_score >= 70 ? "default" : "secondary"}
                  className={conversation.interest_score >= 70 ? "bg-emerald-500" : ""}
                >
                  {conversation.interest_score}%
                </Badge>
              </div>
              {conversation.interest_reason && (
                <span className="text-sm text-muted-foreground">{conversation.interest_reason}</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Messages Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Mensagens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma mensagem ainda
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={msg.id || index}
                  className={cn(
                    "flex gap-3",
                    msg.type === "outbound" ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    msg.type === "outbound" ? "bg-primary/10" : "bg-muted"
                  )}>
                    {msg.type === "outbound" ? (
                      <Bot className="h-4 w-4 text-primary" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </div>
                  <div className={cn(
                    "flex-1 max-w-[80%]",
                    msg.type === "outbound" ? "text-right" : ""
                  )}>
                    <div className={cn(
                      "inline-block p-3 rounded-lg",
                      msg.type === "outbound" 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted"
                    )}>
                      <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                    </div>
                    <div className={cn(
                      "text-xs text-muted-foreground mt-1",
                      msg.type === "outbound" ? "text-right" : ""
                    )}>
                      {formatBRT(new Date(msg.created_at), "dd/MM/yyyy HH:mm")}
                      {msg.status && msg.status !== "sent" && (
                        <span className="ml-2">• {msg.status}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reply Input */}
      {conversation.status !== "opted_out" && conversation.status !== "converted" && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-3">
              <Textarea
                placeholder="Digite sua mensagem..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={3}
              />
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={handleGenerateReply}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Wand2 className="h-4 w-4 mr-2" />
                  )}
                  Sugerir com IA
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={isSending || !newMessage.trim()}
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Enviar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
