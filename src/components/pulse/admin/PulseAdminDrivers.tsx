import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Lock } from 'lucide-react';
import type { PulseDriver } from '@/types/pulse.types';

interface Props {
  drivers: PulseDriver[];
  loading: boolean;
  onToggle: (id: string, isActive: boolean) => void;
  onRefresh: () => void;
}

export function PulseAdminDrivers({ drivers, loading, onToggle, onRefresh }: Props) {
  if (loading && drivers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Drivers de Engajamento</CardTitle>
          <CardDescription>Ative ou desative os drivers que serão medidos</CardDescription>
        </div>
        <button
          onClick={onRefresh}
          className="p-2 hover:bg-accent rounded-md transition-colors"
          title="Atualizar"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {drivers.map(driver => (
            <div
              key={driver.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{driver.name}</span>
                  {driver.is_anonymous && (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <Lock className="h-3 w-3" />
                      Anônimo
                    </Badge>
                  )}
                  {driver.is_default && (
                    <Badge variant="secondary" className="text-xs">Padrão</Badge>
                  )}
                </div>
                {driver.description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {driver.description}
                  </p>
                )}
              </div>
              <Switch
                checked={driver.is_active}
                onCheckedChange={(checked) => onToggle(driver.id, checked)}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
