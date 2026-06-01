import { NavLink } from "@/components/NavLink";
import { useSidebar } from "@/components/ui/sidebar";
import { useJourneyProgress } from "@/hooks/useJourneyProgress";
import { Eye } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarNavItemWithProgressProps {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  journeyId: string;
  colorClass: string;
  bgColorClass: string;
  isViewOnly?: boolean;
  hideProgress?: boolean;
}

export function SidebarNavItemWithProgress({
  title,
  url,
  icon: Icon,
  journeyId,
  colorClass,
  bgColorClass,
  isViewOnly = false,
  hideProgress = false,
}: SidebarNavItemWithProgressProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { getJourneyById, isLoading } = useJourneyProgress();
  
  const journey = getJourneyById(journeyId);
  const completedSteps = journey?.completedSteps ?? 0;
  const totalSteps = journey?.totalSteps ?? 1;
  const progressPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <NavLink
            to={url}
            className="relative flex flex-col items-center justify-center py-2 px-1 hover:bg-accent transition-colors rounded-md"
            activeClassName="bg-primary/10"
          >
            <div className="relative">
              <Icon className={`h-5 w-5 ${colorClass}`} />
              {isViewOnly && (
                <Eye className="absolute -bottom-1 -right-1 h-3 w-3 text-muted-foreground" />
              )}
            </div>
            {!hideProgress && (
              <span className={`text-[9px] font-bold mt-0.5 ${colorClass}`}>
                {progressPercentage}%
              </span>
            )}
          </NavLink>
        </TooltipTrigger>
        <TooltipContent side="right" className="flex flex-col gap-1">
          <span className="font-medium">{title}</span>
          <span className="text-xs text-muted-foreground">
            {completedSteps} de {totalSteps} etapas ({progressPercentage}%)
          </span>
          {isViewOnly && (
            <span className="text-xs text-amber-600">Somente visualização</span>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <NavLink
      to={url}
      className="flex flex-col gap-1 px-4 py-2 hover:bg-accent transition-colors rounded-md"
      activeClassName="bg-primary/10 border-l-2 border-primary"
    >
      {/* Header row with icon, title and percentage */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Icon className={`h-5 w-5 flex-shrink-0 ${colorClass}`} />
          {isViewOnly && (
            <Eye className="absolute -bottom-1 -right-1 h-3 w-3 text-muted-foreground" />
          )}
        </div>
        <span className="font-medium text-sm flex-1">{title}</span>
        {isViewOnly && (
          <span className="text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
            Somente leitura
          </span>
        )}
        {!hideProgress && (
          <span className={`text-xs font-bold transition-all duration-300 ${colorClass}`}>
            {progressPercentage}%
          </span>
        )}
      </div>
      
      {/* Progress bar */}
      {!hideProgress && (
        <div className="ml-8">
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-700 ease-out rounded-full ${bgColorClass}`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {completedSteps} de {totalSteps} etapas
          </p>
        </div>
      )}
    </NavLink>
  );
}
