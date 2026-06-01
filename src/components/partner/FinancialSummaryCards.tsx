import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, TrendingUp, Scale, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { FinancialSummary } from "@/hooks/useEPPartnerFinancials";

interface FinancialSummaryCardsProps {
  summary: FinancialSummary;
}

export function FinancialSummaryCards({ summary }: FinancialSummaryCardsProps) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 2 
    });
  };

  const getNetBalanceDisplay = () => {
    const absValue = Math.abs(summary.netBalance);
    
    if (summary.netBalanceStatus === 'balanced') {
      return {
        label: 'Equilibrado',
        value: formatCurrency(0),
        description: 'Sem saldo pendente',
        icon: Scale,
        colorClass: 'text-blue-600',
        bgClass: 'bg-blue-500/10',
      };
    }
    
    if (summary.netBalanceStatus === 'partner_owes') {
      return {
        label: 'Você Deve',
        value: formatCurrency(absValue),
        description: 'Royalties - Comissões',
        icon: ArrowUpRight,
        colorClass: 'text-amber-600',
        bgClass: 'bg-amber-500/10',
      };
    }
    
    return {
      label: 'A Receber',
      value: formatCurrency(absValue),
      description: 'Comissões - Royalties',
      icon: ArrowDownRight,
      colorClass: 'text-green-600',
      bgClass: 'bg-green-500/10',
    };
  };

  const netBalanceDisplay = getNetBalanceDisplay();

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* A Pagar (Royalties) */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">A Pagar (Royalties)</p>
              <p className="text-2xl font-bold text-amber-600">
                {formatCurrency(summary.royaltiesPending)}
              </p>
              <p className="text-xs text-muted-foreground">
                Total histórico: {formatCurrency(summary.totalRoyalties)}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-amber-500/10">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* A Receber (Comissões) */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">A Receber (Comissões)</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.commissionsPending)}
              </p>
              <p className="text-xs text-muted-foreground">
                Total histórico: {formatCurrency(summary.totalCommissions)}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingDown className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Saldo Líquido */}
      <Card className="border-2 border-primary/20">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Saldo Líquido</p>
              <p className={`text-2xl font-bold ${netBalanceDisplay.colorClass}`}>
                {netBalanceDisplay.value}
              </p>
              <p className="text-xs text-muted-foreground">
                {netBalanceDisplay.label} • {netBalanceDisplay.description}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${netBalanceDisplay.bgClass}`}>
              <netBalanceDisplay.icon className={`h-5 w-5 ${netBalanceDisplay.colorClass}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
