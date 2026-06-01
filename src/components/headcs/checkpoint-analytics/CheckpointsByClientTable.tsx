import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { parseISO } from "date-fns";
import type { CheckpointByClient } from "@/types/checkpoint-analytics.types";
import { formatBRT } from "@/lib/datetime";

interface CheckpointsByClientTableProps {
  data: CheckpointByClient[];
}

export function CheckpointsByClientTable({ data }: CheckpointsByClientTableProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Checkpoints por Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum checkpoint encontrado no período
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Checkpoints por Cliente</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-center">Realizados</TableHead>
              <TableHead className="text-center">Agendados</TableHead>
              <TableHead className="text-center">Último CP</TableHead>
              <TableHead className="text-center">Ações Pend.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, 10).map((client, index) => (
              <TableRow key={client.clientId}>
                <TableCell className="font-medium text-muted-foreground">
                  {client.totalCount === 0 ? '⚠️' : index + 1}
                </TableCell>
                <TableCell className="font-medium truncate max-w-[200px]">
                  {client.clientName}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{client.completedCount}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  {client.scheduledCount > 0 ? (
                    <Badge variant="info">{client.scheduledCount}</Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center text-sm">
                  {client.lastCheckpointDate ? (
                    formatBRT(parseISO(client.lastCheckpointDate), "dd/MM")
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {client.pendingActionsCount > 0 ? (
                    <Badge variant="warning">{client.pendingActionsCount}</Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
