import { useJourneyProgress } from "@/hooks/useJourneyProgress";
import { useSidebar } from "@/components/ui/sidebar";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function SidebarProgressRing() {
  const { overallProgress, completedSteps, totalSteps, isLoading } = useJourneyProgress();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === "/";

  const handleClick = () => navigate("/");

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${isCollapsed ? 'p-2' : 'p-4'}`}>
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
      </div>
    );
  }

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            className={cn(
              "flex flex-col items-center gap-1 p-1 border-b border-border w-full transition-colors cursor-pointer",
              isActive && "bg-primary/10",
              "hover:bg-accent"
            )}
          >
            <div className="relative flex items-center justify-center">
              <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  className="stroke-muted"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  className="stroke-primary transition-all duration-500"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${overallProgress * 0.94} 100`}
                />
              </svg>
              <span className="absolute text-[8px] font-bold text-primary">
                {overallProgress}%
              </span>
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          Home - Progresso Geral
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex flex-col items-center gap-1 p-2 border-b border-border w-full transition-colors cursor-pointer",
        isActive && "bg-primary/10",
        "hover:bg-accent"
      )}
    >
      {/* Circular Progress */}
      <div className="relative flex items-center justify-center">
        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            className="stroke-muted"
            strokeWidth="2.5"
          />
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            className="stroke-primary transition-all duration-700 ease-out"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${overallProgress * 0.94} 100`}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-sm font-bold text-primary transition-all duration-300">{overallProgress}%</span>
        </div>
      </div>

      {/* Text below */}
      <div className="text-center">
        <p className="text-[10px] font-medium text-muted-foreground">Progresso Geral</p>
        <p className="text-[10px] text-muted-foreground">
          {completedSteps} de {totalSteps} etapas
        </p>
      </div>
    </button>
  );
}
