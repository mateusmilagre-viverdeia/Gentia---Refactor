import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, User, Calendar } from "lucide-react";
import { parseISO } from "date-fns";
import type { ClientWithoutCheckpoint } from "@/types/checkpoint-analytics.types";

interface ClientsWithoutCheckpointAlertProps {
  clients: ClientWithoutCheckpoint[];
}

export function ClientsWithoutCheckpointAlert({ clients }: ClientsWithoutCheckpointAlertProps) {
  if (clients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Clientes sem Checkpoint Futuro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            ✅ Todos os clientes têm checkpoints agendados
          </p>
        </CardContent>
      </Card>
    );
  }

  const sortedClients = [...clients].sort((a, b) => {
    // Clients with no history first
    if (a.daysSinceLastCheckpoint === null) return -1;
    if (b.daysSinceLastCheckpoint === null) return 1;
    return b.daysSinceLastCheckpoint - a.daysSinceLastCheckpoint;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Clientes sem Checkpoint Futuro
          <Badge variant="warning" className="ml-auto">{clients.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {sortedClients.slice(0, 10).map((client) => (
            <div
              key={client.id}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium truncate">{client.name}</span>
                {!client.hasConsultant && (
                  <Badge variant="outline" className="text-[10px] px-1.5 flex-shrink-0">
                    Sem consultor
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                <Calendar className="h-3 w-3" />
                {client.daysSinceLastCheckpoint !== null ? (
                  <span className={client.daysSinceLastCheckpoint > 30 ? 'text-red-500 font-medium' : ''}>
                    {client.daysSinceLastCheckpoint}d atrás
                  </span>
                ) : (
                  <span className="text-amber-500 font-medium">Nunca</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
