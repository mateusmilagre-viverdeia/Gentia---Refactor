import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { differenceInBusinessDays, parseISO } from "date-fns";

interface Props {
  clientId: string;
}

export function ClientJobsTab({ clientId }: Props) {
  const navigate = useNavigate();

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["client-jobs", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruitment_jobs")
        .select("id, title, status, created_at, data_limite_entrega, fee_acordado, prazo_entrega_dias")
        .eq("cliente_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const getSlaStatus = (job: any) => {
    if (!job.data_limite_entrega) return null;
    const daysLeft = differenceInBusinessDays(parseISO(job.data_limite_entrega), new Date());
    if (daysLeft < 0) return { label: "Atrasado", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
    if (daysLeft <= 3) return { label: `${daysLeft}d restantes`, color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" };
    return { label: `${daysLeft}d restantes`, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" };
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vaga</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>SLA</TableHead>
            <TableHead className="text-right">Fee</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
          ) : jobs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                <Briefcase className="h-6 w-6 mx-auto mb-2 opacity-40" />
                Nenhuma vaga vinculada
              </TableCell>
            </TableRow>
          ) : jobs.map((job) => {
            const sla = getSlaStatus(job);
            return (
              <TableRow key={job.id} className="cursor-pointer" onClick={() => navigate(`/atracao-contratacao/recrutamento/jobs/${job.id}`)}>
                <TableCell className="font-medium text-sm">{job.title}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">{job.status}</Badge>
                </TableCell>
                <TableCell>
                  {sla ? <Badge variant="secondary" className={sla.color}>{sla.label}</Badge> : "—"}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {job.fee_acordado ? `R$ ${job.fee_acordado.toLocaleString("pt-BR")}` : "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
