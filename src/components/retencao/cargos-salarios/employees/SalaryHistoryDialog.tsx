import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  TrendingUp, 
  Award, 
  Settings, 
  BarChart3, 
  CircleDot,
  ArrowRight 
} from "lucide-react";
import { useEmployeePositionWithHistory } from "@/hooks/useEmployeePositions";
import type { EmployeePositionWithDetails } from "@/hooks/useEmployeePositions";

interface SalaryHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeePositionWithDetails | null;
}

export function SalaryHistoryDialog({ open, onOpenChange, employee }: SalaryHistoryDialogProps) {
  const { data: history, isLoading } = useEmployeePositionWithHistory(employee?.id);

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getChangeTypeConfig = (type: string) => {
    switch (type) {
      case 'promotion':
        return { 
          label: 'Promoção', 
          icon: TrendingUp, 
          color: 'bg-green-100 text-green-700 border-green-200' 
        };
      case 'merit':
        return { 
          label: 'Mérito', 
          icon: Award, 
          color: 'bg-purple-100 text-purple-700 border-purple-200' 
        };
      case 'market':
        return { 
          label: 'Mercado', 
          icon: BarChart3, 
          color: 'bg-blue-100 text-blue-700 border-blue-200' 
        };
      case 'adjustment':
        return { 
          label: 'Ajuste', 
          icon: Settings, 
          color: 'bg-amber-100 text-amber-700 border-amber-200' 
        };
      case 'initial':
        return { 
          label: 'Inicial', 
          icon: CircleDot, 
          color: 'bg-gray-100 text-gray-700 border-gray-200' 
        };
      default:
        return { 
          label: type, 
          icon: CircleDot, 
          color: 'bg-gray-100 text-gray-700 border-gray-200' 
        };
    }
  };

  const calculatePercentChange = (previous: number | null, current: number | null) => {
    if (!previous || !current || previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return change.toFixed(1);
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Histórico de Progressão</DialogTitle>
          <DialogDescription>
            {employee.profile.first_name} {employee.profile.last_name} • {employee.level.position.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Position Summary */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Posição atual</span>
              <Badge variant="outline">{employee.level.name}</Badge>
            </div>
            <div className="text-2xl font-bold font-mono">
              {formatCurrency(employee.current_salary)}
            </div>
            {employee.salary_range && (
              <div className="text-sm text-muted-foreground mt-1">
                Faixa: {formatCurrency(employee.salary_range.minimum)} - {formatCurrency(employee.salary_range.maximum)}
              </div>
            )}
          </div>

          {/* Timeline */}
          <ScrollArea className="h-[300px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-pulse text-muted-foreground">Carregando histórico...</div>
              </div>
            ) : !history || history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum histórico de alteração registrado
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

                {/* Timeline items */}
                <div className="space-y-4">
                  {history.map((entry, index) => {
                    const config = getChangeTypeConfig(entry.change_type);
                    const Icon = config.icon;
                    const percentChange = calculatePercentChange(entry.previous_salary, entry.new_salary);

                    return (
                      <div key={entry.id} className="relative pl-10">
                        {/* Icon */}
                        <div className={`absolute left-0 top-0 h-8 w-8 rounded-full flex items-center justify-center border ${config.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>

                        {/* Content */}
                        <div className="bg-card border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="outline" className={config.color}>
                              {config.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(entry.effective_date)}
                            </span>
                          </div>

                          {/* Salary change */}
                          <div className="flex items-center gap-2 mt-2">
                            {entry.previous_salary && (
                              <>
                                <span className="font-mono text-muted-foreground line-through">
                                  {formatCurrency(entry.previous_salary)}
                                </span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              </>
                            )}
                            <span className="font-mono font-medium">
                              {formatCurrency(entry.new_salary)}
                            </span>
                            {percentChange && (
                              <Badge variant="secondary" className="text-xs">
                                +{percentChange}%
                              </Badge>
                            )}
                          </div>

                          {/* Reason */}
                          {entry.reason && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {entry.reason}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
