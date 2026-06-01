import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { MonthlyFinancialData } from "@/hooks/useEPPartnerFinancials";

interface FinancialHistoryTableProps {
  monthlyData: MonthlyFinancialData[];
}

export function FinancialHistoryTable({ monthlyData }: FinancialHistoryTableProps) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 2 
    });
  };

  const getBalanceDisplay = (balance: number) => {
    if (balance > 0) {
      return {
        icon: <TrendingUp className="h-4 w-4 text-amber-600" />,
        badge: <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Débito</Badge>,
        colorClass: 'text-amber-600',
      };
    }
    if (balance < 0) {
      return {
        icon: <TrendingDown className="h-4 w-4 text-green-600" />,
        badge: <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Crédito</Badge>,
        colorClass: 'text-green-600',
      };
    }
    return {
      icon: <Minus className="h-4 w-4 text-muted-foreground" />,
      badge: <Badge variant="outline">Equilibrado</Badge>,
      colorClass: 'text-muted-foreground',
    };
  };

  if (monthlyData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico Consolidado</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Nenhum registro financeiro encontrado
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Histórico Consolidado</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Período</TableHead>
              <TableHead className="text-right">Royalties (Débito)</TableHead>
              <TableHead className="text-right">Comissões (Crédito)</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthlyData.map((row) => {
              const balanceDisplay = getBalanceDisplay(row.netBalance);
              
              return (
                <TableRow key={row.period}>
                  <TableCell className="font-medium capitalize">
                    {row.periodLabel}
                  </TableCell>
                  <TableCell className="text-right text-amber-600">
                    {row.royalties > 0 ? formatCurrency(row.royalties) : '-'}
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    {row.commissions > 0 ? formatCurrency(row.commissions) : '-'}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${balanceDisplay.colorClass}`}>
                    <div className="flex items-center justify-end gap-1">
                      {balanceDisplay.icon}
                      {formatCurrency(Math.abs(row.netBalance))}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {balanceDisplay.badge}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
