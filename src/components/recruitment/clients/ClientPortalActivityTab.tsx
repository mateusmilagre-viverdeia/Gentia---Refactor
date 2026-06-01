import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Clock, Activity } from "lucide-react";
import { parseISO } from "date-fns";
import { toast } from "sonner";
import { formatBRT, formatBRTRelative } from "@/lib/datetime";

interface ClientPortalActivityTabProps {
  clientId: string;
}

const EVENT_LABELS: Record<string, string> = {
  shortlist_ready: "Shortlist pronta",
  candidate_advanced: "Candidato avançou",
  candidate_hired: "Candidato contratado",
  candidate_approved: "Candidato aprovado",
  candidate_rejected: "Candidato recusado",
  stage_update: "Atualização de etapa",
  sla_warning: "Alerta de prazo",
  feedback_requested: "Feedback solicitado",
  job_opened: "Vaga aberta",
};

export function ClientPortalActivityTab({ clientId }: ClientPortalActivityTabProps) {
  const { data: portalAccess } = useQuery({
    queryKey: ["portal-access-active", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("portal_clientes_acesso")
        .select("token_acesso, ultimo_acesso, email")
        .eq("cliente_id", clientId)
        .eq("ativo", true)
        .order("ultimo_acesso", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!clientId,
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["client-portal-activity", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_portal_activity_log")
        .select("*")
        .eq("cliente_id", clientId)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!clientId,
  });

  const handleOpenAsClient = () => {
    if (portalAccess?.token_acesso) {
      window.open(`${window.location.origin}/portal/${portalAccess.token_acesso}`, "_blank");
    } else {
      toast.info("Nenhum acesso ao portal configurado. Crie um na aba Portal.");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              Atividade do Portal
            </CardTitle>
            {portalAccess?.ultimo_acesso ? (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Último acesso{" "}
                {formatBRTRelative(parseISO(portalAccess.ultimo_acesso))}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Cliente ainda não acessou o portal
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleOpenAsClient} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Ver portal como cliente
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum evento registrado ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {events.map((e) => (
                <div
                  key={e.id}
                  className="flex items-start justify-between gap-3 p-3 rounded border bg-muted/30"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {EVENT_LABELS[e.event_type] || e.event_type}
                      </span>
                      {!e.seen_by_client && (
                        <Badge variant="secondary" className="text-[10px]">
                          Não visto
                        </Badge>
                      )}
                    </div>
                    {(e.event_data as any)?.job_title && (
                      <p className="text-xs text-muted-foreground truncate">
                        {(e.event_data as any).job_title}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0 tabular-nums">
                    {formatBRT(parseISO(e.created_at), "dd/MM HH:mm")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
