import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { parseISO } from "date-fns";
import type { OverdueAction } from "@/types/checkpoint-analytics.types";
import { formatBRT } from "@/lib/datetime";

interface OverdueActionsTableProps {
  actions: OverdueAction[];
  title?: string;
  showUpcoming?: boolean;
}

export function OverdueActionsTable({ actions, title = "Ações Atrasadas", showUpcoming = false }: OverdueActionsTableProps) {
  if (actions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className={`h-4 w-4 ${showUpcoming ? 'text-blue-500' : 'text-red-500'}`} />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            {showUpcoming ? 'Nenhuma ação vencendo em breve' : '✅ Nenhuma ação atrasada'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className={`h-4 w-4 ${showUpcoming ? 'text-blue-500' : 'text-red-500'}`} />
          {title}
          <Badge variant={showUpcoming ? 'info' : 'destructive'} className="ml-auto">
            {actions.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ação</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead className="text-center">Prazo</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {actions.slice(0, 10).map((action) => (
              <TableRow key={action.id}>
                <TableCell className="font-medium truncate max-w-[200px]">
                  {action.title}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]">
                  {action.clientName}
                </TableCell>
                <TableCell className="text-sm">{action.responsible}</TableCell>
                <TableCell className="text-center text-sm">
                  {formatBRT(parseISO(action.dueDate), "dd/MM")}
                </TableCell>
                <TableCell className="text-center">
                  {showUpcoming ? (
                    <Badge variant="info" className="text-[10px]">
                      Em breve
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px]">
                      {action.daysOverdue}d atraso
                    </Badge>
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
