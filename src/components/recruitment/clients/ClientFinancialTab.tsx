import { useFeesHistory, useMarkFeeReceived } from "@/hooks/useFeesHistory";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Check } from "lucide-react";
import { parseISO } from "date-fns";
import { formatBRT } from "@/lib/datetime";

interface Props {
  clientId: string;
}

const statusColors: Record<string, string> = {
  a_receber: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  recebido: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelado: "bg-muted text-muted-foreground",
};

export function ClientFinancialTab({ clientId }: Props) {
  const { data: fees = [], isLoading } = useFeesHistory(clientId);
  const markReceived = useMarkFeeReceived();

  const totalAReceber = fees.filter((f) => f.status === "a_receber").reduce((s, f) => s + f.valor_fee, 0);
  const totalRecebido = fees.filter((f) => f.status === "recebido").reduce((s, f) => s + f.valor_fee, 0);

  return (
    <div className="space-y-4">
      {/* Totals */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Total a receber</p>
          <p className="text-xl font-semibold text-yellow-600">R$ {totalAReceber.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Total recebido</p>
          <p className="text-xl font-semibold text-green-600">R$ {totalRecebido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Previsão</TableHead>
              <TableHead>Recebimento</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : fees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-6 w-6 mx-auto mb-2 opacity-40" />
                  Nenhum registro financeiro
                </TableCell>
              </TableRow>
            ) : fees.map((fee) => (
              <TableRow key={fee.id}>
                <TableCell className="font-medium">R$ {fee.valor_fee.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={statusColors[fee.status] || ""}>
                    {fee.status === "a_receber" ? "A receber" : fee.status === "recebido" ? "Recebido" : "Cancelado"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {fee.data_previsao ? formatBRT(parseISO(fee.data_previsao), "dd/MM/yyyy") : "—"}
                </TableCell>
                <TableCell className="text-sm">
                  {fee.data_recebimento ? formatBRT(parseISO(fee.data_recebimento), "dd/MM/yyyy") : "—"}
                </TableCell>
                <TableCell>
                  {fee.status === "a_receber" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markReceived.mutate(fee.id)}
                      disabled={markReceived.isPending}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Recebido
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
