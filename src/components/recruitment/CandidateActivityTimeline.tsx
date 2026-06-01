import { useState } from "react";
import { Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecruitmentActivities } from "@/hooks/useRecruitmentActivities";
import { ActivityTimelineItem } from "./ActivityTimelineItem";

interface CandidateActivityTimelineProps {
  candidateId: string | null;
  maxItems?: number;
}

export function CandidateActivityTimeline({
  candidateId,
  maxItems = 5,
}: CandidateActivityTimelineProps) {
  const [showAll, setShowAll] = useState(false);
  const { activities, isLoading } = useRecruitmentActivities(candidateId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities.length) {
    return (
      <div className="text-center py-6">
        <Clock className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Nenhuma atividade registrada ainda
        </p>
      </div>
    );
  }

  const displayedActivities = showAll ? activities : activities.slice(0, maxItems);
  const hasMore = activities.length > maxItems;

  return (
    <div className="space-y-1">
      {displayedActivities.map((activity, index) => (
        <ActivityTimelineItem
          key={activity.id}
          activityType={activity.activity_type}
          description={activity.description}
          createdAt={activity.created_at}
          jobTitle={activity.job_title}
          metadata={activity.metadata}
          isLast={index === displayedActivities.length - 1}
        />
      ))}

      {hasMore && (
        <div className="pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Mostrar menos
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Ver mais ({activities.length - maxItems} atividades)
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
