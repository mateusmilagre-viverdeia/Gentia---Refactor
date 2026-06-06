import { useMemo, useState } from "react";
import { AlertTriangle, Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRecruitmentCommunicationAlerts } from "@/hooks/useRecruitmentCommunicationAlerts";
import { cn } from "@/lib/utils";

function severityBadgeVariant(sev: string): "default" | "secondary" | "destructive" | "outline" {
  if (sev === "critical") return "destructive";
  if (sev === "warning") return "secondary";
  return "outline";
}

export function CommunicationAlertsBanner() {
  const { alerts, count, canSee, isLoading, resolveAlert, resolving } = useRecruitmentCommunicationAlerts();
  const [open, setOpen] = useState(false);

  const highestSeverity = useMemo(() => {
    if (!alerts.length) return null;
    if (alerts.some((a) => a.severity === "critical")) return "critical";
    if (alerts.some((a) => a.severity === "warning")) return "warning";
    return "info";
  }, [alerts]);

  if (!canSee) return null;
  if (!isLoading && count === 0) return null;

  return (
    <>
      <div
        className={cn(
          "mb-6 rounded-lg border border-border p-3",
          highestSeverity === "critical" && "bg-destructive/10",
          highestSeverity === "warning" && "bg-muted",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {highestSeverity === "critical" ? (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            ) : (
              <Bell className="h-4 w-4 text-muted-foreground" />
            )}
            <div className="text-sm">
              <span className="font-medium">Alertas de comunicação</span>
              <span className="text-muted-foreground"> — </span>
              <span className="text-muted-foreground">
                {isLoading ? "carregando…" : `${count} ativo${count === 1 ? "" : "s"}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={isLoading}>
              Ver alertas
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Alertas de Comunicação</DialogTitle>
            <DialogDescription>
              Alertas automáticos (regras padrão) para acompanhamento operacional. Visível apenas para gestores de RH.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhum alerta ativo.</div>
            ) : (
              alerts.map((a) => (
                <div key={a.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={severityBadgeVariant(a.severity)}>{a.severity}</Badge>
                        <div className="font-medium">{a.title}</div>
                      </div>
                      <div className="text-sm text-muted-foreground">{a.description}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={async () => {
                        await resolveAlert(a.id);
                      }}
                      disabled={resolving}
                      aria-label="Resolver"
                      title="Resolver"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
