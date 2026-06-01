import { Skeleton } from '@/components/ui/skeleton';
import { OneOnOneAnalyticsSummary } from './OneOnOneAnalyticsSummary';
import { MeetingsFrequencyChart } from './MeetingsFrequencyChart';
import { ActionsStatusChart } from './ActionsStatusChart';
import { CollaboratorsWithoutMeeting } from './CollaboratorsWithoutMeeting';
import { MeetingsTrendChart } from './MeetingsTrendChart';
import type { OneOnOneAnalytics, Meeting } from '@/hooks/useOneOnOneMeetings';

interface OneOnOneDashboardProps {
  analytics: OneOnOneAnalytics;
  meetings: Meeting[];
  isLoading?: boolean;
}

export function OneOnOneDashboard({ analytics, meetings, isLoading }: OneOnOneDashboardProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <OneOnOneAnalyticsSummary analytics={analytics} />

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <MeetingsFrequencyChart data={analytics.meetingsByCollaborator} />
        <ActionsStatusChart actions={analytics.actions} />
      </div>

      {/* Alerts */}
      <CollaboratorsWithoutMeeting 
        inactive={analytics.collaborators.inactive} 
        meetings={meetings}
      />

      {/* Trend Chart */}
      <MeetingsTrendChart data={analytics.monthlyTrend} />
    </div>
  );
}
