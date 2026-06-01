import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGamificationStats } from "@/hooks/useGamificationStats";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function TopbarXPBadge() {
  const { level, totalPoints, progressToNextLevel, pointsToNextLevel, isLoading } = useGamificationStats();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 animate-pulse">
        <div className="h-4 w-4 bg-muted rounded" />
        <div className="h-3 w-12 bg-muted rounded" />
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => navigate("/conquistas")}
          className="flex flex-col gap-1 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-foreground">Lv {level}</span>
          </div>
          <Progress 
            value={progressToNextLevel} 
            className="h-1 w-14 bg-amber-500/20 [&>div]:bg-gradient-to-r [&>div]:from-amber-400 [&>div]:to-amber-600" 
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-center">
        <p className="font-medium">Nível {level}</p>
        <p className="text-xs text-muted-foreground">{totalPoints} XP total</p>
        <p className="text-xs text-muted-foreground">{pointsToNextLevel} XP para nível {level + 1}</p>
        <p className="text-xs text-muted-foreground mt-1">Clique para ver conquistas</p>
      </TooltipContent>
    </Tooltip>
  );
}
