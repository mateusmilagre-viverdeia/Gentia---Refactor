import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCw } from "lucide-react";
import { HealthRadarChart } from "./HealthRadarChart";
import { HealthScoreBadge } from "./HealthScoreBadge";
import {
  AccountHealthRow,
  useRecalculateAccountHealth,
} from "@/hooks/useAccountHealth";
import { formatBRT } from "@/lib/datetime";
;

const INDICATOR_META = [
  {
    key: "usage_score",
    label: "Frequência de uso",
    weight: 20,
    detailKey: "usage",
    description: "Membros ativos nos últimos 30 dias",
  },
  {
    key: "adoption_score",
    label: "Adoção de módulos",
    weight: 20,
    detailKey: "adoption",
    description: "Módulos com atividade real / licenciados",
  },
  {
    key: "engagement_score",
    label: "Engajamento de equipe",
    weight: 15,
    detailKey: "engagement",
    description: "Membros ativos sobre total",
  },
  {
    key: "ai_consumption_score",
    label: "Consumo de IA",
    weight: 15,
    detailKey: "ai_consumption",
    description: "Uso saudável dos créditos de IA",
  },
  {
    key: "billing_score",
    label: "Pagamento em dia",
    weight: 20,
    detailKey: "billing",
    description: "Faturas em aberto / vencidas",
  },
  {
    key: "nps_score",
    label: "NPS / Satisfação",
    weight: 10,
    detailKey: "nps",
    description: "Pesquisa de satisfação",
  },
] as const;

interface AccountHealthDetailDialogProps {
  account: AccountHealthRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function formatDetailValue(detail: any): string {
  if (!detail || typeof detail !== "object") return "—";
  return Object.entries(detail)
    .map(([k, v]) => `${k}: ${typeof v === "number" ? v.toLocaleString("pt-BR") : String(v)}`)
    .join(" • ");
}

export function AccountHealthDetailDialog({
  account,
  open,
  onOpenChange,
}: AccountHealthDetailDialogProps) {
  const recalc = useRecalculateAccountHealth();

  if (!account) return null;

  const isPending = !account.calculated_at;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {account.company_name ?? "Conta sem nome"}
            <HealthScoreBadge
              status={account.health_status}
              score={account.overall_score}
            />
          </DialogTitle>
          <DialogDescription>
            {account.company_sector ?? "Setor não informado"}
            {account.calculated_at && (
              <>
                {" • "}
                Atualizado em{" "}
                {formatBRT(new Date(account.calculated_at), "dd/MM/yyyy HH:mm")}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {isPending ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Saúde ainda não calculada para esta conta. Clique em "Recalcular" para gerar a primeira análise.
            </div>
          ) : (
            <>
              <HealthRadarChart scores={account} />

              <div className="mt-6 space-y-3">
                <h4 className="text-sm font-semibold">Indicadores</h4>
                {INDICATOR_META.map((meta) => {
                  const score = account[meta.key as keyof typeof account] as number;
                  const detail = account.indicators_detail?.[meta.detailKey];
                  return (
                    <div
                      key={meta.key}
                      className="rounded-lg border p-3 flex items-start justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{meta.label}</span>
                          <span className="text-xs text-muted-foreground">
                            peso {meta.weight}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {meta.description}
                        </p>
                        <p className="text-xs text-muted-foreground/80 mt-1 truncate">
                          {formatDetailValue(detail)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-bold">{score}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                          / 100
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            onClick={() => recalc.mutate({ account_id: account.account_id })}
            disabled={recalc.isPending}
          >
            {recalc.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Recalcular esta conta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
