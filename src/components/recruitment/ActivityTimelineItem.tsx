import { formatBRT, formatBRTRelative } from "@/lib/datetime";
import {
  FileText,
  ArrowRight,
  Calendar,
  Play,
  CheckCircle,
  Mail,
  StickyNote,
  UserCheck,
  XCircle,
  Brain,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ActivityType } from "@/hooks/useRecruitmentActivities";

interface ActivityTimelineItemProps {
  activityType: ActivityType;
  description: string;
  createdAt: string;
  jobTitle?: string;
  metadata?: Record<string, unknown>;
  isLast?: boolean;
}

const ACTIVITY_CONFIG: Record<ActivityType, { 
  icon: React.ComponentType<{ className?: string }>; 
  color: string;
  bgColor: string;
}> = {
  application_created: {
    icon: FileText,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  status_change: {
    icon: ArrowRight,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  interview_scheduled: {
    icon: Calendar,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  interview_started: {
    icon: Play,
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
  },
  interview_completed: {
    icon: CheckCircle,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  email_sent: {
    icon: Mail,
    color: "text-sky-600 dark:text-sky-400",
    bgColor: "bg-sky-100 dark:bg-sky-900/30",
  },
  note_added: {
    icon: StickyNote,
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-800",
  },
  hired: {
    icon: UserCheck,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  rejected: {
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
  disc_completed: {
    icon: Brain,
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-100 dark:bg-violet-900/30",
  },
};

export function ActivityTimelineItem({
  activityType,
  description,
  createdAt,
  jobTitle,
  isLast = false,
}: ActivityTimelineItemProps) {
  const config = ACTIVITY_CONFIG[activityType] || ACTIVITY_CONFIG.status_change;
  const Icon = config.icon;

  const formattedDate = formatBRT(createdAt, "dd MMM yyyy 'às' HH:mm");
  const relativeTime = formatBRTRelative(createdAt);

  return (
    <div className="flex gap-3 relative">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-4 top-8 w-0.5 h-[calc(100%-8px)] bg-border" />
      )}

      {/* Icon */}
      <div className={cn(
        "relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        config.bgColor
      )}>
        <Icon className={cn("h-4 w-4", config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-4">
        <p className="text-sm font-medium text-foreground leading-snug">
          {description}
        </p>
        
        <div className="flex items-center gap-2 mt-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground cursor-default">
                  {relativeTime}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <span>{formattedDate}</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {jobTitle && (
            <>
              <span className="text-muted-foreground/50">•</span>
              <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                {jobTitle}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
