import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Flag, Plus, Loader2 } from 'lucide-react';
;
import { cn } from '@/lib/utils';
import { CheckpointCard } from './CheckpointCard';
import { useOnboardingCheckpoints } from '@/hooks/useOnboardingCheckpoints';
import type { OnboardingCheckpointStatus } from '@/types/onboarding.types';

interface CheckpointsSectionProps {
  processId: string;
  startDate: string;
}

export function CheckpointsSection({ processId, startDate }: CheckpointsSectionProps) {
  const { 
    checkpoints, 
    isLoading, 
    createDefaultCheckpoints,
    updateCheckpointStatus,
    refetch,
  } = useOnboardingCheckpoints(processId);

  const handleCreateDefaults = () => {
    createDefaultCheckpoints.mutate({ processId, startDate });
  };

  const handleStatusUpdate = (id: string, status: OnboardingCheckpointStatus) => {
    updateCheckpointStatus.mutate({ id, status });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (checkpoints.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Checkpoints
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              Nenhum checkpoint configurado para este onboarding.
            </p>
            <Button 
              onClick={handleCreateDefaults}
              disabled={createDefaultCheckpoints.isPending}
            >
              {createDefaultCheckpoints.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              <Plus className="h-4 w-4 mr-2" />
              Criar Checkpoints Padrão (7, 30, 60, 90 dias)
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate overall checkpoint progress
  const completedCount = checkpoints.filter(c => c.status === 'completed').length;
  const atRiskCount = checkpoints.filter(c => c.status === 'at_risk').length;
  const attentionCount = checkpoints.filter(c => c.status === 'attention').length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5" />
              Checkpoints do Onboarding
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                🟢 {completedCount}
              </Badge>
              {attentionCount > 0 && (
                <Badge variant="outline" className="gap-1 border-yellow-500">
                  🟡 {attentionCount}
                </Badge>
              )}
              {atRiskCount > 0 && (
                <Badge variant="outline" className="gap-1 border-red-500">
                  🔴 {atRiskCount}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Timeline visualization */}
          <div className="relative mb-6">
            <div className="absolute top-4 left-0 right-0 h-1 bg-muted rounded-full" />
            <div className="relative flex justify-between">
              {checkpoints.map((checkpoint, index) => (
                <div key={checkpoint.id} className="flex flex-col items-center">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium z-10',
                    checkpoint.status === 'completed' && 'bg-green-500 text-white',
                    checkpoint.status === 'at_risk' && 'bg-red-500 text-white',
                    checkpoint.status === 'attention' && 'bg-yellow-500 text-white',
                    checkpoint.status === 'pending' && 'bg-muted border-2 border-border',
                  )}>
                    {checkpoint.checkpoint_day}
                  </div>
                  <span className="text-xs text-muted-foreground mt-2">
                    Dia {checkpoint.checkpoint_day}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Checkpoint Cards */}
      <div className="space-y-4">
        {checkpoints.map((checkpoint) => (
          <CheckpointCard
            key={checkpoint.id}
            checkpoint={checkpoint}
            processId={processId}
            onStatusUpdate={handleStatusUpdate}
            onResponseSubmit={() => refetch()}
          />
        ))}
      </div>
    </div>
  );
}
