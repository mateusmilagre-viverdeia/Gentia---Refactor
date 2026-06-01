import { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  GripVertical, Search, ExternalLink, Clock, AlertTriangle,
  Filter, Users, Sparkles,
} from 'lucide-react';
import { cn, safeScrapeString } from '@/lib/utils';
import { formatBRTRelative } from "@/lib/datetime";


const PIPELINE_STAGES = [
  { id: 'found', name: 'Encontrado', color: 'bg-slate-500' },
  { id: 'analyzed', name: 'Analisado', color: 'bg-blue-500' },
  { id: 'approached', name: 'Abordado', color: 'bg-purple-500' },
  { id: 'responded', name: 'Respondeu', color: 'bg-cyan-500' },
  { id: 'interested', name: 'Interessado', color: 'bg-amber-500' },
  { id: 'interview', name: 'Entrevista', color: 'bg-orange-500' },
  { id: 'hired', name: 'Contratado', color: 'bg-green-600' },
];

interface HuntingPipelineResult {
  id: string;
  candidate_name: string | null;
  source_url: string | null;
  source: string;
  hunting_score: number | null;
  match_score: number | null;
  pipeline_stage: string;
  stage_changed_at: string | null;
  status: string;
  tags: string[];
  extracted_data: any;
  search_id: string;
  job_title?: string;
}

interface PipelineCardProps {
  result: HuntingPipelineResult;
  isDragging?: boolean;
}

function PipelineCard({ result, isDragging = false }: PipelineCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: result.id,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const name = result.candidate_name || result.extracted_data?.name || 'Candidato';
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const score = result.hunting_score ?? result.match_score ?? 0;
  const title = safeScrapeString(result.extracted_data?.title);
  const company = safeScrapeString(result.extracted_data?.company);
  const stageTime = result.stage_changed_at
    ? formatBRTRelative(new Date(result.stage_changed_at))
    : null;

  const isStuck = result.stage_changed_at &&
    (Date.now() - new Date(result.stage_changed_at).getTime()) > 7 * 24 * 60 * 60 * 1000;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-card border rounded-lg p-3 shadow-sm transition-shadow cursor-grab active:cursor-grabbing',
        isDragging && 'shadow-lg opacity-90 ring-2 ring-primary',
        isStuck && 'border-destructive/50',
        'hover:shadow-md'
      )}
    >
      <div className="flex items-start gap-2">
        <div {...attributes} {...listeners} className="mt-1 text-muted-foreground hover:text-foreground cursor-grab">
          <GripVertical className="h-4 w-4" />
        </div>
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{name}</p>
          {(title || company) && (
            <p className="text-xs text-muted-foreground truncate">
              {title}{company && ` @ ${company}`}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge
              variant={score >= 70 ? 'success' : score >= 40 ? 'warning' : 'destructive'}
              className="text-[9px] px-1.5 py-0"
            >
              {score}%
            </Badge>
            {stageTime && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {stageTime}
              </span>
            )}
            {isStuck && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <AlertTriangle className="h-3 w-3 text-destructive" />
                  </TooltipTrigger>
                  <TooltipContent>Parado há mais de 7 dias</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {result.tags?.length > 0 && (
            <div className="flex flex-wrap gap-0.5 mt-1">
              {result.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="outline" className="text-[9px] px-1 py-0">{tag}</Badge>
              ))}
            </div>
          )}
        </div>
        {result.source_url && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={(e) => { e.stopPropagation(); window.open(result.source_url!, '_blank'); }}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface PipelineColumnProps {
  stage: typeof PIPELINE_STAGES[0];
  results: HuntingPipelineResult[];
}

function PipelineColumn({ stage, results }: PipelineColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: stage.id });
  const stuckCount = results.filter(r =>
    r.stage_changed_at && (Date.now() - new Date(r.stage_changed_at).getTime()) > 7 * 24 * 60 * 60 * 1000
  ).length;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col w-72 min-h-[500px] rounded-lg border bg-muted/30 transition-colors',
        isOver && 'ring-2 ring-primary ring-offset-2 bg-muted/50'
      )}
    >
      <div className="flex items-center gap-2 p-3 border-b">
        <div className={cn('w-2 h-2 rounded-full', stage.color)} />
        <span className="font-medium text-sm">{stage.name}</span>
        <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {results.length}
        </span>
        {stuckCount > 0 && (
          <Badge variant="destructive" className="text-[9px] px-1 py-0">
            {stuckCount} parado{stuckCount > 1 ? 's' : ''}
          </Badge>
        )}
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        {results.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
            Arraste candidatos aqui
          </div>
        ) : (
          results.map(result => <PipelineCard key={result.id} result={result} />)
        )}
      </div>
    </div>
  );
}

interface HuntingPipelineKanbanProps {
  accountId: string;
}

export function HuntingPipelineKanban({ accountId }: HuntingPipelineKanbanProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [jobFilter, setJobFilter] = useState<string>('all');
  const [scoreFilter, setScoreFilter] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Fetch all hunting results with pipeline data
  const { data: allResults = [], isLoading } = useQuery({
    queryKey: ['hunting-pipeline', accountId],
    queryFn: async (): Promise<HuntingPipelineResult[]> => {
      // Use type assertion to avoid deep type instantiation on this complex table
      const client = supabase as any;
      const { data, error } = await client
        .from('recruitment_hunting_results')
        .select('id, candidate_name, source_url, source, hunting_score, match_score, pipeline_stage, stage_changed_at, status, tags, extracted_data, search_id')
        .eq('account_id', accountId)
        .not('status', 'eq', 'discarded')
        .order('hunting_score', { ascending: false });

      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        pipeline_stage: r.pipeline_stage || 'found',
        tags: r.tags || [],
        job_title: r.recruitment_hunting_searches?.recruitment_jobs?.title || '',
      }));
    },
    enabled: !!accountId,
  });

  // Get unique jobs for filter
  const jobs = useMemo(() => {
    const map = new Map<string, string>();
    allResults.forEach(r => {
      const jobId = (r as any).recruitment_hunting_searches?.job_id;
      if (jobId && r.job_title) map.set(jobId, r.job_title);
    });
    return Array.from(map, ([id, title]) => ({ id, title }));
  }, [allResults]);

  // Filter results
  const filteredResults = useMemo(() => {
    return allResults.filter(r => {
      if (jobFilter !== 'all') {
        const jobId = (r as any).recruitment_hunting_searches?.job_id;
        if (jobId !== jobFilter) return false;
      }
      if (scoreFilter > 0 && (r.hunting_score ?? 0) < scoreFilter) return false;
      if (searchQuery) {
        const name = (r.candidate_name || r.extracted_data?.name || '').toLowerCase();
        if (!name.includes(searchQuery.toLowerCase())) return false;
      }
      return true;
    });
  }, [allResults, jobFilter, scoreFilter, searchQuery]);

  const updateStageMutation = useMutation({
    mutationFn: async ({ resultId, stage }: { resultId: string; stage: string }) => {
      const client = supabase as any;
      const { error } = await client
        .from('recruitment_hunting_results')
        .update({ pipeline_stage: stage, stage_changed_at: new Date().toISOString() })
        .eq('id', resultId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hunting-pipeline'] });
    },
    onError: () => {
      toast({ title: 'Erro ao mover candidato', variant: 'destructive' });
    },
  });

  const activeResult = activeId ? filteredResults.find(r => r.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const resultId = active.id as string;
    const newStage = over.id as string;
    const result = filteredResults.find(r => r.id === resultId);
    if (!result || result.pipeline_stage === newStage) return;

    updateStageMutation.mutate({ resultId, stage: newStage });
  };

  // KPIs
  const kpis = useMemo(() => {
    const total = filteredResults.length;
    const approached = filteredResults.filter(r => !['found', 'analyzed'].includes(r.pipeline_stage)).length;
    const interested = filteredResults.filter(r => ['interested', 'interview', 'hired'].includes(r.pipeline_stage)).length;
    const hired = filteredResults.filter(r => r.pipeline_stage === 'hired').length;
    const stuck = filteredResults.filter(r =>
      r.stage_changed_at && (Date.now() - new Date(r.stage_changed_at).getTime()) > 7 * 24 * 60 * 60 * 1000
    ).length;
    return { total, approached, interested, hired, stuck };
  }, [filteredResults]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={jobFilter} onValueChange={setJobFilter}>
            <SelectTrigger className="w-48 h-8 text-xs">
              <SelectValue placeholder="Todas as vagas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as vagas</SelectItem>
              {jobs.map(j => (
                <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Select value={String(scoreFilter)} onValueChange={(v) => setScoreFilter(Number(v))}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Score mínimo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Qualquer score</SelectItem>
            <SelectItem value="50">≥ 50%</SelectItem>
            <SelectItem value="70">≥ 70%</SelectItem>
            <SelectItem value="80">≥ 80%</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Buscar candidato..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 h-8 w-48 text-xs"
          />
        </div>

        {/* Mini KPIs */}
        <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {kpis.total} total</span>
          <span className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-amber-500" /> {kpis.interested} interessados</span>
          <span className="flex items-center gap-1 text-green-600">{kpis.hired} contratados</span>
          {kpis.stuck > 0 && (
            <span className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="h-3 w-3" /> {kpis.stuck} parados
            </span>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando pipeline...</div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <ScrollArea className="w-full">
            <div className="flex gap-4 pb-4 min-w-max">
              {PIPELINE_STAGES.map(stage => (
                <PipelineColumn
                  key={stage.id}
                  stage={stage}
                  results={filteredResults.filter(r => r.pipeline_stage === stage.id)}
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <DragOverlay>
            {activeResult && <PipelineCard result={activeResult} isDragging />}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
