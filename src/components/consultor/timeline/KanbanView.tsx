import { useMemo } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useState } from 'react';
import { ProjectMilestone, MilestoneStatus, KanbanColumn as KanbanColumnType, getMilestoneStatusLabel, PILLAR_CONFIG, isMilestoneOverdue } from '@/types/project-timeline.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, PlayCircle, CheckCircle2, Ban, XCircle, AlertTriangle, Calendar } from 'lucide-react';
import { formatBRT } from "@/lib/datetime";


interface KanbanViewProps {
  milestones: ProjectMilestone[];
  loading: boolean;
  onUpdateStatus: (id: string, status: MilestoneStatus) => Promise<boolean>;
  onUpdateMilestone: (id: string, updates: Partial<ProjectMilestone>) => Promise<boolean>;
  readOnly?: boolean;
}

const COLUMNS: { id: MilestoneStatus; title: string; icon: React.ReactNode; color: string }[] = [
  { id: 'pending', title: 'Pendente', icon: <Clock className="h-4 w-4" />, color: 'bg-muted' },
  { id: 'in_progress', title: 'Em Andamento', icon: <PlayCircle className="h-4 w-4" />, color: 'bg-blue-100 dark:bg-blue-950' },
  { id: 'blocked', title: 'Bloqueado', icon: <Ban className="h-4 w-4" />, color: 'bg-red-100 dark:bg-red-950' },
  { id: 'completed', title: 'Concluído', icon: <CheckCircle2 className="h-4 w-4" />, color: 'bg-green-100 dark:bg-green-950' },
];

interface KanbanCardProps {
  milestone: ProjectMilestone;
  isDragging?: boolean;
}

function KanbanCardBody({ milestone, isDragging }: KanbanCardProps) {
  const isOverdue = isMilestoneOverdue(milestone);
  const pillarConfig = milestone.pillar ? PILLAR_CONFIG[milestone.pillar as keyof typeof PILLAR_CONFIG] : null;

  return (
    <div
      className={
        `bg-card border rounded-lg p-3 transition-all hover:shadow-md ` +
        `${isDragging ? 'opacity-50 shadow-lg' : ''} ` +
        `${isOverdue ? 'border-red-300 bg-red-50/50 dark:bg-red-950/30' : ''}`
      }
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm line-clamp-2 flex items-center gap-1">
            {milestone.milestone_name}
            {isOverdue && <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />}
          </h4>
        </div>

        {pillarConfig && (
          <Badge
            variant="outline"
            className="text-xs"
            style={{
              backgroundColor: `${pillarConfig.color}15`,
              borderColor: pillarConfig.color,
              color: pillarConfig.color,
            }}
          >
            {pillarConfig.label}
          </Badge>
        )}

        {milestone.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{milestone.description}</p>
        )}

        <div className="flex items-center gap-2">
          <Progress value={milestone.progress_percentage} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground">{milestone.progress_percentage}%</span>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {milestone.planned_end && (
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : ''}`}>
              <Calendar className="h-3 w-3" />
              {formatBRT(new Date(milestone.planned_end), 'dd MMM')}
            </span>
          )}
          {milestone.responsible && <span className="truncate max-w-20">{milestone.responsible}</span>}
        </div>
      </div>
    </div>
  );
}

function SortableKanbanCard({ milestone, isDragging }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: milestone.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing"
    >
      <KanbanCardBody milestone={milestone} isDragging={isDragging} />
    </div>
  );
}

function StaticKanbanCard({ milestone }: { milestone: ProjectMilestone }) {
  return (
    <div className="cursor-default">
      <KanbanCardBody milestone={milestone} />
    </div>
  );
}

function KanbanColumn({ 
  column, 
  milestones,
  readOnly,
}: { 
  column: typeof COLUMNS[0]; 
  milestones: ProjectMilestone[];
  readOnly?: boolean;
}) {
  return (
    <div className="w-72 shrink-0">
      <Card className={`h-full ${column.color}`}>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              {column.icon}
              {column.title}
            </span>
            <Badge variant="secondary" className="text-xs">
              {milestones.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-2">
          <ScrollArea className="h-[calc(100vh-320px)]">
            {readOnly ? (
              <div className="space-y-2 p-2">
                {milestones.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">Nenhum marco</div>
                ) : (
                  milestones.map((milestone) => <StaticKanbanCard key={milestone.id} milestone={milestone} />)
                )}
              </div>
            ) : (
              <SortableContext items={milestones.map(m => m.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2 p-2">
                  {milestones.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">Nenhum marco</div>
                  ) : (
                    milestones.map(milestone => (
                      <SortableKanbanCard key={milestone.id} milestone={milestone} />
                    ))
                  )}
                </div>
              </SortableContext>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export function KanbanView({ milestones, loading, onUpdateStatus, readOnly = false }: KanbanViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const columnMilestones = useMemo(() => {
    const result: Record<MilestoneStatus, ProjectMilestone[]> = {
      pending: [],
      in_progress: [],
      completed: [],
      blocked: [],
      cancelled: [],
    };

    milestones.forEach(m => {
      if (result[m.status]) {
        result[m.status].push(m);
      }
    });

    return result;
  }, [milestones]);

  const activeMilestone = activeId ? milestones.find(m => m.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const overId = over.id as string;
    
    // Check if dropped on a column
    const targetColumn = COLUMNS.find(col => col.id === overId);
    if (targetColumn) {
      const milestone = milestones.find(m => m.id === active.id);
      if (milestone && milestone.status !== targetColumn.id) {
        onUpdateStatus(milestone.id, targetColumn.id);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="w-72 shrink-0">
            <Skeleton className="h-[500px] w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (readOnly) {
    return (
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4 min-w-min">
          {COLUMNS.filter(col => col.id !== 'cancelled').map(column => (
            <KanbanColumn 
              key={column.id} 
              column={column} 
              milestones={columnMilestones[column.id]}
              readOnly
            />
          ))}
        </div>
      </ScrollArea>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4 min-w-min">
          {COLUMNS.filter(col => col.id !== 'cancelled').map(column => (
            <KanbanColumn 
              key={column.id} 
              column={column} 
              milestones={columnMilestones[column.id]} 
              readOnly={false}
            />
          ))}
        </div>
      </ScrollArea>

      <DragOverlay>
        {activeMilestone && (
          <div className="w-72">
            <KanbanCardBody milestone={activeMilestone} isDragging />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
