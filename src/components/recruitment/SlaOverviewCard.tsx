import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { differenceInBusinessDays, parseISO, isAfter } from "date-fns";

interface SlaJob {
  id: string;
  title: string;
  data_limite_entrega: string;
  cliente_nome: string | null;
}

function getSlaStatus(deadline: string): { label: string; variant: "success" | "warning" | "destructive"; days: number } {
  const now = new Date();
  const deadlineDate = parseISO(deadline);
  
  if (isAfter(now, deadlineDate)) {
    const overdueDays = differenceInBusinessDays(now, deadlineDate);
    return { label: `${overdueDays}d atrasado`, variant: "destructive", days: -overdueDays };
  }
  
  const remaining = differenceInBusinessDays(deadlineDate, now);
  if (remaining <= 3) {
    return { label: `${remaining}d restantes`, variant: "warning", days: remaining };
  }
  return { label: `${remaining}d restantes`, variant: "success", days: remaining };
}

export function SlaOverviewCard({ period }: { period?: string }) {
  const { currentAccount } = useOrganization();

  const { data: slaJobs = [] } = useQuery({
    queryKey: ["sla-overview", currentAccount?.id],
    queryFn: async () => {
      if (!currentAccount?.id) return [];
      const { data, error } = await supabase
        .from("recruitment_jobs")
        .select("id, title, data_limite_entrega, cliente_id, clientes_consultoria:cliente_id(razao_social, nome_fantasia)")
        .eq("account_id", currentAccount.id)
        .not("data_limite_entrega", "is", null)
        .in("status", ["active", "draft"])
        .order("data_limite_entrega", { ascending: true })
        .limit(10);

      if (error) throw error;
      return (data || []).map((j: any) => ({
        id: j.id,
        title: j.title,
        data_limite_entrega: j.data_limite_entrega,
        cliente_nome: j.clientes_consultoria?.nome_fantasia || j.clientes_consultoria?.razao_social || null,
      })) as SlaJob[];
    },
    enabled: !!currentAccount?.id,
  });

  if (slaJobs.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Prazos de Entrega (SLA)
        </CardTitle>
        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {slaJobs.map((job) => {
            const sla = getSlaStatus(job.data_limite_entrega);
            return (
              <Link
                key={job.id}
                to={`/atracao-contratacao/recrutamento/jobs/${job.id}`}
                className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {job.title}
                  </p>
                  {job.cliente_nome && (
                    <p className="text-xs text-muted-foreground truncate">{job.cliente_nome}</p>
                  )}
                </div>
                <Badge
                  variant={sla.variant === "success" ? "success" : sla.variant === "warning" ? "warning" : "destructive"}
                  className="ml-2 shrink-0"
                >
                  {sla.label}
                </Badge>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
