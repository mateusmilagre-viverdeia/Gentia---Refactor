import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Trophy } from "lucide-react";

interface StepProgressIndicatorProps {
  title: string;
  progress: number;
  points: number;
  status: 'locked' | 'available' | 'in_progress' | 'completed' | 'skipped';
  compact?: boolean;
}

export function StepProgressIndicator({ 
  title, 
  progress, 
  points, 
  status,
  compact = false 
}: StepProgressIndicatorProps) {
  const getStatusInfo = () => {
    switch (status) {
      case 'completed':
        return { 
          icon: <CheckCircle2 className="h-4 w-4 text-green-500" />, 
          label: 'Concluído',
          color: 'text-green-600'
        };
      case 'in_progress':
        return { 
          icon: <Clock className="h-4 w-4 text-amber-500" />, 
          label: `${progress}% concluído`,
          color: 'text-amber-600'
        };
      case 'available':
        return { 
          icon: <Trophy className="h-4 w-4 text-muted-foreground" />, 
          label: 'Disponível',
          color: 'text-muted-foreground'
        };
      default:
        return { 
          icon: null, 
          label: 'Bloqueado',
          color: 'text-muted-foreground'
        };
    }
  };

  const { icon, label, color } = getStatusInfo();

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        {icon}
        <span className={color}>{title}</span>
        <span className="text-muted-foreground">•</span>
        <span className={color}>{label}</span>
        {status !== 'completed' && (
          <>
            <span className="text-muted-foreground">•</span>
            <span className="text-primary font-medium">+{points} pts</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={color}>{label}</span>
          {status !== 'completed' && (
            <Badge variant="secondary" className="text-xs">
              +{points} pts
            </Badge>
          )}
        </div>
      </div>
      {status === 'in_progress' && (
        <Progress value={progress} className="h-2" />
      )}
    </div>
  );
}
