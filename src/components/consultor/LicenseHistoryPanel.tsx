import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLicenseHistory, LicenseChange } from "@/hooks/useLicenseHistory";
import { AccessLevel } from "@/hooks/useAccountLicensedModules";
import { 
  Check, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  History, 
  User,
  RotateCcw,
  FileText,
  Plus,
  Pencil,
  Trash2
} from "lucide-react";
import { formatBRT } from "@/lib/datetime";


interface LicenseHistoryPanelProps {
  accountId?: string;
  showAllAccounts?: boolean;
}

const ACCESS_LEVEL_CONFIG: Record<AccessLevel, { label: string; icon: React.ReactNode; color: string }> = {
  full: { 
    label: 'Completo', 
    icon: <Check className="h-3 w-3" />,
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
  },
  view_only: { 
    label: 'Visualização', 
    icon: <Eye className="h-3 w-3" />,
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
  },
  disabled: { 
    label: 'Desabilitado', 
    icon: <EyeOff className="h-3 w-3" />,
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  },
};

const CHANGE_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  create: { 
    label: 'Criação', 
    icon: <Plus className="h-3 w-3" />,
    color: 'text-green-600'
  },
  update: { 
    label: 'Atualização', 
    icon: <Pencil className="h-3 w-3" />,
    color: 'text-blue-600'
  },
  delete: { 
    label: 'Remoção', 
    icon: <Trash2 className="h-3 w-3" />,
    color: 'text-red-600'
  },
  reset: { 
    label: 'Reset', 
    icon: <RotateCcw className="h-3 w-3" />,
    color: 'text-amber-600'
  },
  template_applied: { 
    label: 'Template', 
    icon: <FileText className="h-3 w-3" />,
    color: 'text-purple-600'
  },
};

export function LicenseHistoryPanel({ accountId, showAllAccounts }: LicenseHistoryPanelProps) {
  const { history, loading, loadHistory, loadHistoryForAccount } = useLicenseHistory();

  useEffect(() => {
    if (showAllAccounts) {
      loadHistory(100);
    } else if (accountId) {
      loadHistoryForAccount(accountId);
    }
  }, [accountId, showAllAccounts, loadHistory, loadHistoryForAccount]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group history by date
  const groupedHistory = history.reduce((groups, change) => {
    const date = formatBRT(new Date(change.changedAt), "yyyy-MM-dd");
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(change);
    return groups;
  }, {} as Record<string, LicenseChange[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Histórico de Alterações
        </CardTitle>
        <CardDescription>
          {showAllAccounts 
            ? 'Todas as alterações de licenciamento recentes'
            : 'Alterações de licenciamento deste cliente'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma alteração registrada ainda.</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-6">
              {Object.entries(groupedHistory).map(([date, changes]) => (
                <div key={date}>
                  <div className="sticky top-0 bg-background py-2 z-10">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      {formatBRT(new Date(date), "EEEE, dd 'de' MMMM 'de' yyyy")}
                    </h3>
                  </div>
                  <div className="space-y-3 mt-2">
                    {changes.map((change) => (
                      <HistoryItem 
                        key={change.id} 
                        change={change} 
                        showAccount={showAllAccounts}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

interface HistoryItemProps {
  change: LicenseChange;
  showAccount?: boolean;
}

function HistoryItem({ change, showAccount }: HistoryItemProps) {
  const changeConfig = CHANGE_TYPE_CONFIG[change.changeType] || CHANGE_TYPE_CONFIG.update;
  const previousConfig = change.previousAccessLevel 
    ? ACCESS_LEVEL_CONFIG[change.previousAccessLevel] 
    : null;
  const newConfig = ACCESS_LEVEL_CONFIG[change.newAccessLevel];

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <div className={`mt-0.5 ${changeConfig.color}`}>
        {changeConfig.icon}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {showAccount && change.accountName && (
            <Badge variant="outline" className="text-xs">
              {change.accountName}
            </Badge>
          )}
          <span className="font-medium text-sm">{change.moduleSlug}</span>
          <Badge variant="secondary" className={`text-xs ${changeConfig.color}`}>
            {changeConfig.label}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 mt-1.5">
          {previousConfig && (
            <>
              <Badge variant="outline" className={`text-xs ${previousConfig.color}`}>
                {previousConfig.icon}
                <span className="ml-1">{previousConfig.label}</span>
              </Badge>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </>
          )}
          <Badge variant="outline" className={`text-xs ${newConfig.color}`}>
            {newConfig.icon}
            <span className="ml-1">{newConfig.label}</span>
          </Badge>
        </div>

        {change.notes && (
          <p className="text-xs text-muted-foreground mt-1.5">{change.notes}</p>
        )}

        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span>{change.changedByName || 'Usuário'}</span>
          <span>•</span>
          <span>{formatBRT(new Date(change.changedAt), "HH:mm")}</span>
        </div>
      </div>
    </div>
  );
}
