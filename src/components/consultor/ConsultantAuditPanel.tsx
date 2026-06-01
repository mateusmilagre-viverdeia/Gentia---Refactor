
import { useConsultantAuditLogs, ConsultantAccessLog } from '@/hooks/useConsultantAuditLogs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Eye, 
  FileEdit, 
  Trash2, 
  Plus, 
  Download, 
  Building2,
  User,
  Clock
} from 'lucide-react';
import { formatBRT } from "@/lib/datetime";

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  view_project: { label: 'Visualizou projeto', icon: Eye, color: 'bg-blue-500' },
  view_checkpoints: { label: 'Visualizou checkpoints', icon: Eye, color: 'bg-blue-500' },
  view_notes: { label: 'Visualizou notas', icon: Eye, color: 'bg-blue-500' },
  view_culture: { label: 'Visualizou cultura', icon: Eye, color: 'bg-blue-500' },
  create_checkpoint: { label: 'Criou checkpoint', icon: Plus, color: 'bg-green-500' },
  update_checkpoint: { label: 'Atualizou checkpoint', icon: FileEdit, color: 'bg-yellow-500' },
  delete_checkpoint: { label: 'Excluiu checkpoint', icon: Trash2, color: 'bg-red-500' },
  create_action: { label: 'Criou ação', icon: Plus, color: 'bg-green-500' },
  update_action: { label: 'Atualizou ação', icon: FileEdit, color: 'bg-yellow-500' },
  delete_action: { label: 'Excluiu ação', icon: Trash2, color: 'bg-red-500' },
  create_note: { label: 'Criou nota', icon: Plus, color: 'bg-green-500' },
  update_note: { label: 'Atualizou nota', icon: FileEdit, color: 'bg-yellow-500' },
  delete_note: { label: 'Excluiu nota', icon: Trash2, color: 'bg-red-500' },
  export_data: { label: 'Exportou dados', icon: Download, color: 'bg-purple-500' },
};

interface ConsultantAuditPanelProps {
  consultantId?: string;
  accountId?: string;
  limit?: number;
  showConsultant?: boolean;
  showCompany?: boolean;
}

function AuditLogItem({ 
  log, 
  showConsultant = true, 
  showCompany = true 
}: { 
  log: ConsultantAccessLog; 
  showConsultant?: boolean; 
  showCompany?: boolean;
}) {
  const config = ACTION_CONFIG[log.action] || { 
    label: log.action, 
    icon: Eye, 
    color: 'bg-gray-500' 
  };
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-b-0">
      <div className={`p-2 rounded-full ${config.color} text-white`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{config.label}</span>
          <Badge variant="outline" className="text-xs">
            {log.resource_type}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
          {showConsultant && log.consultant && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {log.consultant.name}
            </span>
          )}
          {showCompany && log.company && (
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {log.company.name}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatBRT(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm")}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ConsultantAuditPanel({ 
  consultantId, 
  accountId, 
  limit = 50,
  showConsultant = true,
  showCompany = true
}: ConsultantAuditPanelProps) {
  const { logs, loading, error } = useConsultantAuditLogs({ 
    consultantId, 
    accountId, 
    limit 
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Log de Auditoria</CardTitle>
          <CardDescription>Carregando...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Log de Auditoria</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log de Auditoria</CardTitle>
        <CardDescription>
          Registro de acessos e ações de consultores EP para compliance
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum registro de acesso encontrado
          </p>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-1">
              {logs.map((log) => (
                <AuditLogItem 
                  key={log.id} 
                  log={log} 
                  showConsultant={showConsultant}
                  showCompany={showCompany}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
