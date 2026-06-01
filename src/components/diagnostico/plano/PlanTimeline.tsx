import { useState, useRef, useEffect } from 'react';
import { DndContext, DragOverlay, useDraggable, useDroppable, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { CheckCircle2, Clock, Circle, RefreshCw, ArrowRight, BarChart3, AlertTriangle, CalendarDays, MousePointerClick, Pencil, Trash2, X, Plus, GripHorizontal } from 'lucide-react';
;
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { AIPlan, PlanStep } from '@/types/implementation-plan.types';
import { SOLUTIONS_CATALOG } from '@/types/implementation-plan.types';

interface PlanTimelineProps {
  plan: AIPlan;
  steps: PlanStep[];
  onRegenerate: () => void;
  isRegenerating: boolean;
  onMetricsUpdate?: (metrics: AIPlan['metrics']) => void;
  onStepUpdate?: (stepId: string, updates: Partial<PlanStep>) => void;
  onStepDelete?: (stepId: string) => void;
}

const pillarColors: Record<string, string> = {};
SOLUTIONS_CATALOG.forEach((g) => {
  pillarColors[g.pillar] = g.color;
});

const pillarLabels: Record<string, string> = {};
SOLUTIONS_CATALOG.forEach((g) => {
  pillarLabels[g.pillar] = g.label;
});

const statusIcon = (status: PlanStep['status']) => {
  switch (status) {
    case 'completed': return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
    case 'in_progress': return <Clock className="h-5 w-5 text-amber-500 animate-pulse" />;
    case 'overdue': return <AlertTriangle className="h-5 w-5 text-destructive" />;
    default: return <Circle className="h-5 w-5 text-muted-foreground/40" />;
  }
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return null;
  }
};

const getDeadlineBadge = (step: PlanStep) => {
  if (step.status === 'completed') return null;
  if (!step.dueDate) return null;

  const now = new Date();
  const due = new Date(step.dueDate);
  const isOverdue = now > due;

  if (isOverdue) {
    return (
      <Badge variant="destructive" className="text-[9px] whitespace-nowrap">
        <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
        Atrasado
      </Badge>
    );
  }

  return (
    <Badge variant="success" className="text-[9px] whitespace-nowrap">
      <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
      No prazo
    </Badge>
  );
};

const statusLabels: Record<PlanStep['status'], string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  completed: 'Concluído',
  overdue: 'Atrasado',
};

type DragData = {
  stepId: string;
  metricIndex: number;
  metricText: string;
};

// Draggable metric badge
function DraggableMetricBadge({ stepId, metricIndex, metricText, isEditable, onRemove }: {
  stepId: string;
  metricIndex: number;
  metricText: string;
  isEditable: boolean;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${stepId}-metric-${metricIndex}`,
    data: { stepId, metricIndex, metricText } as DragData,
    disabled: !isEditable,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn('inline-flex', isDragging && 'opacity-30')}
      {...(isEditable ? { ...attributes, ...listeners } : {})}
    >
      <Badge
        variant="secondary"
        className={cn(
          'text-[9px] group/badge',
          isEditable && 'cursor-grab active:cursor-grabbing',
        )}
      >
        {isEditable && <GripHorizontal className="h-2 w-2 mr-0.5 opacity-0 group-hover/badge:opacity-40" />}
        {metricText}
        {isEditable && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="ml-0.5 opacity-0 group-hover/badge:opacity-100 transition-opacity"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        )}
      </Badge>
    </div>
  );
}

// Droppable zone for each step's metrics
function DroppableMetricsZone({ stepId, isOver, children }: { stepId: string; isOver?: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver: droppableIsOver } = useDroppable({ id: stepId });
  const active = isOver ?? droppableIsOver;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex items-center gap-1 mt-2 flex-wrap min-h-[24px] rounded-md p-0.5 transition-colors',
        active && 'bg-primary/10 ring-1 ring-primary/30',
      )}
    >
      {children}
    </div>
  );
}

type EditingField = {
  stepId: string;
  field: 'name' | 'durationMin' | 'durationMax' | 'startDate' | 'dueDate' | 'newMetric';
};

export const PlanTimeline = ({ plan, steps, onRegenerate, isRegenerating, onMetricsUpdate, onStepUpdate, onStepDelete }: PlanTimelineProps) => {
  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const [editingCell, setEditingCell] = useState<{ row: number; col: 'current' | 'target' | 'name' | 'impact' } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [fieldValue, setFieldValue] = useState('');
  const [addingMetricStep, setAddingMetricStep] = useState<string | null>(null);
  const [newMetricValue, setNewMetricValue] = useState('');
  const [confirmDeleteStep, setConfirmDeleteStep] = useState<string | null>(null);
  const [confirmDeleteMetricRow, setConfirmDeleteMetricRow] = useState<number | null>(null);
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const stepInputRef = useRef<HTMLInputElement>(null);
  const metricInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  useEffect(() => {
    if (editingField && stepInputRef.current) {
      stepInputRef.current.focus();
      stepInputRef.current.select();
    }
  }, [editingField]);

  useEffect(() => {
    if (addingMetricStep && metricInputRef.current) {
      metricInputRef.current.focus();
    }
  }, [addingMetricStep]);

  // --- Metric table editing ---
  const handleDoubleClick = (row: number, col: 'current' | 'target' | 'name' | 'impact') => {
    const metric = plan.metrics[row];
    const val = col === 'current' ? metric.current : col === 'target' ? metric.target : col === 'name' ? metric.name : metric.impact;
    setEditValue(val);
    setEditingCell({ row, col });
  };

  const handleSave = () => {
    if (!editingCell || !onMetricsUpdate) return;
    const colMap: Record<string, keyof AIPlan['metrics'][0]> = {
      current: 'current',
      target: 'target',
      name: 'name',
      impact: 'impact',
    };
    const updated = plan.metrics.map((m, i) => {
      if (i !== editingCell.row) return m;
      return { ...m, [colMap[editingCell.col]]: editValue };
    });
    onMetricsUpdate(updated);
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') setEditingCell(null);
  };

  const handleDeleteMetricRow = (index: number) => {
    if (!onMetricsUpdate) return;
    const updated = plan.metrics.filter((_, i) => i !== index);
    onMetricsUpdate(updated);
    setConfirmDeleteMetricRow(null);
  };

  const handleAddMetricRow = () => {
    if (!onMetricsUpdate) return;
    const updated = [...plan.metrics, { name: 'Nova métrica', current: '-', target: '-', impact: 'Médio' }];
    onMetricsUpdate(updated);
  };

  // --- Step inline editing ---
  const startEditField = (stepId: string, field: EditingField['field'], currentValue: string) => {
    setEditingField({ stepId, field });
    setFieldValue(currentValue);
  };

  const saveField = () => {
    if (!editingField || !onStepUpdate) return;
    onStepUpdate(editingField.stepId, { [editingField.field]: fieldValue });
    setEditingField(null);
  };

  const handleFieldKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveField();
    if (e.key === 'Escape') setEditingField(null);
  };

  const handleDateChange = (stepId: string, field: 'startDate' | 'dueDate', date: Date | undefined) => {
    if (!date || !onStepUpdate) return;
    onStepUpdate(stepId, { [field]: date.toISOString() });
  };

  const handleStatusChange = (stepId: string, status: PlanStep['status']) => {
    if (!onStepUpdate) return;
    onStepUpdate(stepId, { status });
  };

  const handleRemoveStepMetric = (stepId: string, metricIndex: number, currentMetrics: string[]) => {
    if (!onStepUpdate) return;
    onStepUpdate(stepId, { metrics: currentMetrics.filter((_, i) => i !== metricIndex) });
  };

  const handleAddStepMetric = (stepId: string, currentMetrics: string[]) => {
    if (!onStepUpdate || !newMetricValue.trim()) return;
    onStepUpdate(stepId, { metrics: [...currentMetrics, newMetricValue.trim()] });
    setNewMetricValue('');
    setAddingMetricStep(null);
  };

  const handleDeleteStep = (stepId: string) => {
    if (!onStepDelete) return;
    onStepDelete(stepId);
    setConfirmDeleteStep(null);
  };

  const progressPercent = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;
  const isEditable = !!onStepUpdate;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDrag(event.active.data.current as DragData);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDrag(null);
    if (!over || !onStepUpdate) return;

    const dragData = active.data.current as DragData;
    const targetStepId = over.id as string;

    if (dragData.stepId === targetStepId) return;

    const sourceStep = steps.find(s => s.id === dragData.stepId);
    const targetStep = steps.find(s => s.id === targetStepId);
    if (!sourceStep || !targetStep) return;

    // Remove from source
    const newSourceMetrics = sourceStep.metrics.filter((_, i) => i !== dragData.metricIndex);
    // Add to target
    const newTargetMetrics = [...targetStep.metrics, dragData.metricText];

    onStepUpdate(dragData.stepId, { metrics: newSourceMetrics });
    onStepUpdate(targetStepId, { metrics: newTargetMetrics });
  };

  const handleDragCancel = () => setActiveDrag(null);

  return (
    <TooltipProvider delayDuration={300}>
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
      <div className="space-y-6">
        {/* Summary */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Seu Plano Personalizado</CardTitle>
              <Button variant="outline" size="sm" onClick={onRegenerate} disabled={isRegenerating}>
                <RefreshCw className={`h-4 w-4 mr-1 ${isRegenerating ? 'animate-spin' : ''}`} />
                Regenerar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{plan.summary}</p>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Progresso geral</span>
                  <span className="font-medium">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
              <Badge variant="outline" className="text-xs whitespace-nowrap">
                <Clock className="h-3 w-3 mr-1" />
                {plan.totalDurationMin} — {plan.totalDurationMax}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Editing hint */}
        {isEditable && (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Pencil className="h-3 w-3" />
            Clique nos campos para editar · Arraste badges entre etapas para reorganizar métricas
          </p>
        )}

        {/* Timeline */}
        <div className="relative pl-6 space-y-0">
          {steps.map((step, index) => {
            const isEditingName = editingField?.stepId === step.id && editingField.field === 'name';
            const isEditingDurMin = editingField?.stepId === step.id && editingField.field === 'durationMin';
            const isEditingDurMax = editingField?.stepId === step.id && editingField.field === 'durationMax';

            return (
              <div key={step.id} className="relative pb-6 last:pb-0 group/step">
                {index < steps.length - 1 && (
                  <div className="absolute left-[-14px] top-6 bottom-0 w-px bg-border" />
                )}
                <div className="absolute left-[-23px] top-0.5">
                  {statusIcon(step.status)}
                </div>

                <Card className={cn(
                  'transition-all',
                  step.status === 'completed' && 'opacity-70',
                  step.status === 'overdue' && 'border-destructive/50',
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-muted-foreground">#{step.order}</span>

                          {/* Editable name */}
                          {isEditingName ? (
                            <Input
                              ref={stepInputRef}
                              value={fieldValue}
                              onChange={(e) => setFieldValue(e.target.value)}
                              onBlur={saveField}
                              onKeyDown={handleFieldKeyDown}
                              className="h-7 text-sm font-semibold flex-1 min-w-[200px]"
                            />
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <h4
                                  className={cn(
                                    'text-sm font-semibold',
                                    isEditable && 'cursor-pointer hover:text-primary transition-colors group/name'
                                  )}
                                  onClick={() => isEditable && startEditField(step.id, 'name', step.name)}
                                >
                                  {step.name}
                                  {isEditable && <Pencil className="h-2.5 w-2.5 inline ml-1 opacity-0 group-hover/name:opacity-40" />}
                                </h4>
                              </TooltipTrigger>
                              {isEditable && <TooltipContent side="top"><p className="text-xs">Clique para editar</p></TooltipContent>}
                            </Tooltip>
                          )}

                          <Badge
                            className="text-[10px]"
                            style={{
                              backgroundColor: `${pillarColors[step.pillar] || '#6B7280'}20`,
                              color: pillarColors[step.pillar] || '#6B7280',
                            }}
                          >
                            {pillarLabels[step.pillar] || step.pillar}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                          {/* Editable duration */}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {isEditingDurMin ? (
                              <Input
                                ref={stepInputRef}
                                value={fieldValue}
                                onChange={(e) => setFieldValue(e.target.value)}
                                onBlur={saveField}
                                onKeyDown={handleFieldKeyDown}
                                className="h-5 w-20 text-xs px-1"
                              />
                            ) : (
                              <span
                                className={cn(isEditable && 'cursor-pointer hover:text-primary transition-colors')}
                                onClick={() => isEditable && startEditField(step.id, 'durationMin', step.durationMin)}
                              >
                                {step.durationMin}
                              </span>
                            )}
                            <span>—</span>
                            {isEditingDurMax ? (
                              <Input
                                ref={stepInputRef}
                                value={fieldValue}
                                onChange={(e) => setFieldValue(e.target.value)}
                                onBlur={saveField}
                                onKeyDown={handleFieldKeyDown}
                                className="h-5 w-20 text-xs px-1"
                              />
                            ) : (
                              <span
                                className={cn(isEditable && 'cursor-pointer hover:text-primary transition-colors')}
                                onClick={() => isEditable && startEditField(step.id, 'durationMax', step.durationMax)}
                              >
                                {step.durationMax}
                              </span>
                            )}
                          </span>

                          {/* Editable start date */}
                          {isEditable ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <span className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors">
                                  <CalendarDays className="h-3 w-3" />
                                  Início: {formatDate(step.startDate) || 'Definir'}
                                </span>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={step.startDate ? new Date(step.startDate) : undefined}
                                  onSelect={(d) => handleDateChange(step.id, 'startDate', d)}
                                  locale={ptBR}
                                  className="p-3 pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                          ) : step.startDate ? (
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              Início: {formatDate(step.startDate)}
                            </span>
                          ) : null}

                          {/* Editable due date */}
                          {isEditable ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <span className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors">
                                  <CalendarDays className="h-3 w-3" />
                                  Prazo: {formatDate(step.dueDate) || 'Definir'}
                                </span>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={step.dueDate ? new Date(step.dueDate) : undefined}
                                  onSelect={(d) => handleDateChange(step.id, 'dueDate', d)}
                                  locale={ptBR}
                                  className="p-3 pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                          ) : step.dueDate ? (
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              Prazo: {formatDate(step.dueDate)}
                            </span>
                          ) : null}

                          {step.dependencies.length > 0 && (
                            <span className="flex items-center gap-1">
                              <ArrowRight className="h-3 w-3" />
                              Depende de: {step.dependencies.join(', ')}
                            </span>
                          )}
                        </div>

                        {/* Editable step metrics with drag & drop */}
                        {(step.metrics.length > 0 || isEditable) && (
                          <DroppableMetricsZone stepId={step.id}>
                            <BarChart3 className="h-3 w-3 text-muted-foreground" />
                            {step.metrics.map((m, i) => (
                              <DraggableMetricBadge
                                key={`${step.id}-${i}`}
                                stepId={step.id}
                                metricIndex={i}
                                metricText={m}
                                isEditable={isEditable}
                                onRemove={() => handleRemoveStepMetric(step.id, i, step.metrics)}
                              />
                            ))}
                            {isEditable && addingMetricStep === step.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  ref={metricInputRef}
                                  value={newMetricValue}
                                  onChange={(e) => setNewMetricValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddStepMetric(step.id, step.metrics);
                                    if (e.key === 'Escape') { setAddingMetricStep(null); setNewMetricValue(''); }
                                  }}
                                  onBlur={() => {
                                    if (newMetricValue.trim()) handleAddStepMetric(step.id, step.metrics);
                                    else { setAddingMetricStep(null); setNewMetricValue(''); }
                                  }}
                                  placeholder="Nova métrica..."
                                  className="h-5 w-28 text-[9px] px-1"
                                />
                              </div>
                            ) : isEditable ? (
                              <button
                                onClick={() => { setAddingMetricStep(step.id); setNewMetricValue(''); }}
                                className="text-muted-foreground/50 hover:text-primary transition-colors"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            ) : null}
                          </DroppableMetricsZone>
                        )}
                      </div>

                      {/* Status + actions */}
                      <div className="flex flex-col items-end gap-1">
                        {isEditable ? (
                          <Select
                            value={step.status}
                            onValueChange={(val) => handleStatusChange(step.id, val as PlanStep['status'])}
                          >
                            <SelectTrigger className="h-6 w-auto min-w-[110px] text-[10px] border-0 p-0 px-1.5 focus:ring-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.keys(statusLabels) as PlanStep['status'][]).map((s) => (
                                <SelectItem key={s} value={s} className="text-xs">
                                  {statusLabels[s]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge
                            variant={
                              step.status === 'completed' ? 'success' :
                              step.status === 'overdue' ? 'destructive' :
                              step.status === 'in_progress' ? 'warning' : 'secondary'
                            }
                            className="text-[10px] whitespace-nowrap"
                          >
                            {statusLabels[step.status]}
                          </Badge>
                        )}
                        {getDeadlineBadge(step)}

                        {/* Delete button */}
                        {isEditable && onStepDelete && (
                          confirmDeleteStep === step.id ? (
                            <div className="flex items-center gap-1 mt-1">
                              <Button variant="destructive" size="sm" className="h-5 text-[9px] px-1.5" onClick={() => handleDeleteStep(step.id)}>
                                Excluir
                              </Button>
                              <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={() => setConfirmDeleteStep(null)}>
                                Cancelar
                              </Button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteStep(step.id)}
                              className="mt-1 opacity-0 group-hover/step:opacity-60 hover:!opacity-100 text-muted-foreground hover:text-destructive transition-all"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Metrics */}
        {plan.metrics && plan.metrics.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Métricas de Acompanhamento
              </CardTitle>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                <MousePointerClick className="h-3 w-3" />
                Clique duas vezes nos campos para editar os valores
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 font-medium text-xs">Métrica</th>
                      <th className="text-center py-2 px-2 font-medium text-xs">Atual</th>
                      <th className="text-center py-2 px-2 font-medium text-xs">Meta</th>
                      <th className="text-right py-2 px-2 font-medium text-xs">Impacto</th>
                      {onMetricsUpdate && <th className="w-8"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {plan.metrics.map((m, i) => (
                      <tr key={i} className="border-b last:border-0 group/row">
                        {/* Editable metric name */}
                        <td
                          className="py-2 px-2 text-xs cursor-pointer hover:bg-muted/50 rounded transition-colors"
                          onDoubleClick={() => handleDoubleClick(i, 'name')}
                        >
                          {editingCell?.row === i && editingCell.col === 'name' ? (
                            <Input
                              ref={inputRef}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleSave}
                              onKeyDown={handleKeyDown}
                              className="h-6 text-xs px-1"
                            />
                          ) : m.name}
                        </td>
                        <td
                          className="text-center py-1 px-1 text-xs text-destructive cursor-pointer hover:bg-muted/50 rounded transition-colors"
                          onDoubleClick={() => handleDoubleClick(i, 'current')}
                        >
                          {editingCell?.row === i && editingCell.col === 'current' ? (
                            <Input
                              ref={inputRef}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleSave}
                              onKeyDown={handleKeyDown}
                              className="h-6 text-xs text-center px-1"
                            />
                          ) : m.current}
                        </td>
                        <td
                          className="text-center py-1 px-1 text-xs text-emerald-600 cursor-pointer hover:bg-muted/50 rounded transition-colors"
                          onDoubleClick={() => handleDoubleClick(i, 'target')}
                        >
                          {editingCell?.row === i && editingCell.col === 'target' ? (
                            <Input
                              ref={inputRef}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleSave}
                              onKeyDown={handleKeyDown}
                              className="h-6 text-xs text-center px-1"
                            />
                          ) : m.target}
                        </td>
                        {/* Editable impact */}
                        <td
                          className="text-right py-2 px-2 text-xs font-medium text-primary cursor-pointer hover:bg-muted/50 rounded transition-colors"
                          onDoubleClick={() => handleDoubleClick(i, 'impact')}
                        >
                          {editingCell?.row === i && editingCell.col === 'impact' ? (
                            <Input
                              ref={inputRef}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleSave}
                              onKeyDown={handleKeyDown}
                              className="h-6 text-xs text-right px-1"
                            />
                          ) : m.impact}
                        </td>
                        {onMetricsUpdate && (
                          <td className="py-1 px-1">
                            {confirmDeleteMetricRow === i ? (
                              <div className="flex items-center gap-0.5">
                                <button onClick={() => handleDeleteMetricRow(i)} className="text-destructive text-[9px] font-medium">Sim</button>
                                <button onClick={() => setConfirmDeleteMetricRow(null)} className="text-muted-foreground text-[9px]">Não</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteMetricRow(i)}
                                className="opacity-0 group-hover/row:opacity-50 hover:!opacity-100 text-muted-foreground hover:text-destructive transition-all"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {onMetricsUpdate && (
                  <Button variant="ghost" size="sm" className="mt-2 text-xs h-7" onClick={handleAddMetricRow}>
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar métrica
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <DragOverlay>
        {activeDrag ? (
          <Badge variant="secondary" className="text-[9px] shadow-lg">
            <GripHorizontal className="h-2 w-2 mr-0.5" />
            {activeDrag.metricText}
          </Badge>
        ) : null}
      </DragOverlay>
      </DndContext>
    </TooltipProvider>
  );
};
