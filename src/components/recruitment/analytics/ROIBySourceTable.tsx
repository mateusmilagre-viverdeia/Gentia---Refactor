import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSourceROIAnalytics, type SourceROIData } from "@/hooks/useSourceROIAnalytics";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";
import { DollarSign, TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ROIBySourceTableProps {
  period: DashboardPeriod;
}

export function ROIBySourceTable({ period }: ROIBySourceTableProps) {
  const { data, isLoading } = useSourceROIAnalytics(period);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4" />
            ROI por Fonte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4" />
            ROI por Fonte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
            <DollarSign className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-sm">Nenhum dado de ROI disponível</p>
            <p className="text-xs mt-1">Adicione gastos por fonte na aba "ROI de Fontes" para ver análises</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals
  const totals = data.reduce(
    (acc, item) => ({
      spend: acc.spend + item.spend,
      candidates: acc.candidates + item.candidates,
      qualified: acc.qualified + item.qualified,
      hired: acc.hired + item.hired,
    }),
    { spend: 0, candidates: 0, qualified: 0, hired: 0 }
  );

  const avgCostPerHire = totals.hired > 0 && totals.spend > 0
    ? Math.round(totals.spend / totals.hired)
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4" />
            ROI por Fonte
          </span>
          {avgCostPerHire !== null && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="gap-1">
                    <span className="text-muted-foreground">Custo/Contratação Médio:</span>
                    <span className="font-bold">R$ {avgCostPerHire.toLocaleString("pt-BR")}</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Média ponderada considerando todas as fontes</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[350px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fonte</TableHead>
                <TableHead className="text-right">Gasto</TableHead>
                <TableHead className="text-right">Candidatos</TableHead>
                <TableHead className="text-right">Contratados</TableHead>
                <TableHead className="text-right">Custo/Contratação</TableHead>
                <TableHead className="text-right">Eficiência</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <ROITableRow key={row.source} data={row} avgCostPerHire={avgCostPerHire} />
              ))}
              
              {/* Totals Row */}
              <TableRow className="font-medium bg-muted/50">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">
                  R$ {totals.spend.toLocaleString("pt-BR")}
                </TableCell>
                <TableCell className="text-right">{totals.candidates}</TableCell>
                <TableCell className="text-right">{totals.hired}</TableCell>
                <TableCell className="text-right">
                  {avgCostPerHire !== null 
                    ? `R$ ${avgCostPerHire.toLocaleString("pt-BR")}`
                    : "-"
                  }
                </TableCell>
                <TableCell className="text-right">-</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </ScrollArea>

        {/* No spend warning */}
        {totals.spend === 0 && totals.candidates > 0 && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-700">Nenhum gasto registrado</p>
              <p className="text-amber-600 text-xs mt-0.5">
                Registre os gastos por fonte na aba "ROI de Fontes" para calcular custo por contratação
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ROITableRow({ data, avgCostPerHire }: { data: SourceROIData; avgCostPerHire: number | null }) {
  // Determine efficiency indicator
  const getEfficiencyIndicator = () => {
    if (data.costPerHire === null || avgCostPerHire === null) {
      return { icon: Minus, color: "text-muted-foreground", label: "N/A" };
    }

    const ratio = data.costPerHire / avgCostPerHire;
    
    if (ratio < 0.8) {
      return { icon: TrendingUp, color: "text-primary", label: "Eficiente" };
    } else if (ratio > 1.2) {
      return { icon: TrendingDown, color: "text-destructive", label: "Caro" };
    } else {
      return { icon: Minus, color: "text-muted-foreground", label: "Médio" };
    }
  };

  const efficiency = getEfficiencyIndicator();
  const EfficiencyIcon = efficiency.icon;

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <div 
            className="w-2.5 h-2.5 rounded-full shrink-0" 
            style={{ backgroundColor: data.color }}
          />
          <span>{data.sourceLabel}</span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        {data.spend > 0 
          ? `R$ ${data.spend.toLocaleString("pt-BR")}`
          : <span className="text-muted-foreground">-</span>
        }
      </TableCell>
      <TableCell className="text-right">{data.candidates}</TableCell>
      <TableCell className="text-right">
        {data.hired > 0 ? (
          <span className="font-medium">{data.hired}</span>
        ) : (
          <span className="text-muted-foreground">0</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {data.costPerHire !== null ? (
          <span className="font-medium">R$ {data.costPerHire.toLocaleString("pt-BR")}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <div className={`flex items-center justify-end gap-1 ${efficiency.color}`}>
                <EfficiencyIcon className="h-4 w-4" />
                <span className="text-xs">{efficiency.label}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {data.costPerHire !== null && avgCostPerHire !== null
                  ? `${Math.round((data.costPerHire / avgCostPerHire) * 100)}% da média`
                  : "Sem dados suficientes"
                }
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
    </TableRow>
  );
}
