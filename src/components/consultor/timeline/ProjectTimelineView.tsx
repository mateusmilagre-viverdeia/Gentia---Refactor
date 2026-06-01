import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useProjectMilestones } from '@/hooks/useProjectMilestones';
import { TimelineViewMode } from '@/types/project-timeline.types';
import { ListView } from './ListView';
import { GanttView } from './GanttView';
import { KanbanView } from './KanbanView';
import { TimelineWidgets } from './TimelineWidgets';
import { MilestoneFormDialog } from './MilestoneFormDialog';
import { ApplyPlaybookDialog } from '@/components/playbooks/ApplyPlaybookDialog';
import { List, BarChart3, Columns3, Plus, RefreshCw, BookOpen } from 'lucide-react';

interface ProjectTimelineViewProps {
  accountId: string;
  healthScore?: {
    health_score: number;
    health_status: string;
  } | null;
  readOnly?: boolean;
}

export function ProjectTimelineView({ accountId, healthScore, readOnly = false }: ProjectTimelineViewProps) {
  const [viewMode, setViewMode] = useState<TimelineViewMode>('list');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showApplyPlaybookDialog, setShowApplyPlaybookDialog] = useState(false);
  
  const { 
    milestones, 
    loading, 
    createMilestone, 
    updateMilestone,
    updateMilestoneStatus,
    deleteMilestone,
    refreshMilestones 
  } = useProjectMilestones(accountId);

  const handleCreateMilestone = async (data: Parameters<typeof createMilestone>[0]) => {
    await createMilestone(data);
    setShowCreateDialog(false);
  };

  return (
    <div className="flex gap-6">
      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as TimelineViewMode)}>
            <TabsList>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                Lista
              </TabsTrigger>
              <TabsTrigger value="gantt" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Gantt
              </TabsTrigger>
              <TabsTrigger value="kanban" className="flex items-center gap-2">
                <Columns3 className="h-4 w-4" />
                Kanban
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshMilestones}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {!readOnly && (
              <>
                <Button variant="outline" onClick={() => setShowApplyPlaybookDialog(true)}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Aplicar Playbook
                </Button>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Marco
                </Button>
              </>
            )}
          </div>
        </div>

        {/* View Content */}
        {viewMode === 'list' && (
          <ListView 
            milestones={milestones}
            loading={loading}
            onUpdateStatus={updateMilestoneStatus}
            onUpdateMilestone={updateMilestone}
            onDeleteMilestone={deleteMilestone}
            readOnly={readOnly}
          />
        )}
        {viewMode === 'gantt' && (
          <GanttView 
            milestones={milestones}
            loading={loading}
            onUpdateMilestone={updateMilestone}
            readOnly={readOnly}
          />
        )}
        {viewMode === 'kanban' && (
          <KanbanView 
            milestones={milestones}
            loading={loading}
            onUpdateStatus={updateMilestoneStatus}
            onUpdateMilestone={updateMilestone}
            readOnly={readOnly}
          />
        )}
      </div>

      {/* Right Sidebar Widgets */}
      <div className="w-80 shrink-0 hidden xl:block">
        <TimelineWidgets 
          milestones={milestones}
          healthScore={healthScore}
        />
      </div>

      {/* Create Milestone Dialog */}
      <MilestoneFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateMilestone}
        accountId={accountId}
      />

      {/* Apply Playbook Dialog */}
      <ApplyPlaybookDialog
        open={showApplyPlaybookDialog}
        onOpenChange={setShowApplyPlaybookDialog}
        accountId={accountId}
        onApplied={refreshMilestones}
      />
    </div>
  );
}
