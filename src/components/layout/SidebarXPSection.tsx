import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGamificationStats } from "@/hooks/useGamificationStats";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SidebarXPSection() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { level, totalPoints, progressToNextLevel, pointsToNextLevel, isLoading } = useGamificationStats();
  const navigate = useNavigate();

  const handleClick = () => navigate("/conquistas");

  if (isLoading) {
    return (
      <div className="p-4 border-t border-border">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/2 mb-2" />
          <div className="h-2 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (isCollapsed) {
    return (
      <div 
        className="p-2 border-t border-border cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={handleClick}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col items-center gap-1">
              <div className="relative">
                <Sparkles className="h-5 w-5 text-amber-500" />
              </div>
              <span className="text-xs font-bold text-foreground">Lv{level}</span>
              <span className="text-[10px] text-muted-foreground">{totalPoints}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <div className="text-sm">
              <p className="font-medium">Nível {level}</p>
              <p className="text-muted-foreground">{totalPoints} XP total</p>
              <p className="text-muted-foreground">Clique para ver conquistas</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div 
      className="p-4 border-t border-border cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={handleClick}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-foreground">Nível {level}</span>
          </div>
          <span className="text-xs text-muted-foreground">{totalPoints} XP</span>
        </div>
        
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500"
            style={{ width: `${progressToNextLevel}%` }}
          />
        </div>
        
        <p className="text-[10px] text-muted-foreground text-center">
          {pointsToNextLevel} XP para nível {level + 1}
        </p>
      </div>
    </div>
  );
}
