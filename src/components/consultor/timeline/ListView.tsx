import { useState } from 'react';
import { ProjectMilestone, MilestoneStatus, getMilestoneStatusLabel, STATUS_COLORS, PILLAR_CONFIG, isMilestoneOverdue } from '@/types/project-timeline.types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MilestoneChecklist } from '@/components/playbooks/MilestoneChecklist';
import { MoreHorizontal, Calendar, AlertTriangle, Check, Clock, Ban, Pause, Trash2, Edit, ChevronDown, ChevronRight, BookOpen, ListChecks } from 'lucide-react';
import { formatBRT } from "@/lib/datetime";


interface ListViewProps {
  milestones: ProjectMilestone[];
  loading: boolean;
  onUpdateStatus: (id: string, status: MilestoneStatus) => Promise<boolean>;
  onUpdateMilestone: (id: string, updates: Partial<ProjectMilestone>) => Promise<boolean>;
  onDeleteMilestone: (id: string) => Promise<boolean>;
  readOnly?: boolean;
}

const STATUS_OPTIONS: { value: MilestoneStatus; label: string; icon: React.ReactNode }[] = [
  { value: 'pending', label: 'Pendente', icon: <Clock className="h-4 w-4" /> },
  { value: 'in_progress', label: 'Em Andamento', icon: <Pause className="h-4 w-4" /> },
  { value: 'completed', label: 'Concluído', icon: <Check className="h-4 w-4" /> },
  { value: 'blocked', label: 'Bloqueado', icon: <Ban className="h-4 w-4" /> },
  { value: 'cancelled', label: 'Cancelado', icon: <Trash2 className="h-4 w-4" /> },
];

export function ListView({ milestones, loading, onUpdateStatus, onUpdateMilestone, onDeleteMilestone, readOnly = false }: ListViewProps) {
  const [filterStatus, setFilterStatus] = useState<MilestoneStatus | 'all'>('all');
  const [filterPillar, setFilterPillar] = useState<string>('all');
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedMilestones);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedMilestones(newExpanded);
  };

  const filteredMilestones = milestones.filter(m => {
    if (filterStatus !== 'all' && m.status !== filterStatus) return false;
    if (filterPillar !== 'all' && m.pillar !== filterPillar) return false;
    return true;
  });

  const getStatusBadge = (status: MilestoneStatus) => {
    const colors = STATUS_COLORS[status];
    return (
      <Badge variant="outline" className={`${colors.bg} ${colors.border} ${colors.text}`}>
        {getMilestoneStatusLabel(status)}
      </Badge>
    );
  };

  const getPillarBadge = (pillar: string | null) => {
    if (!pillar) return null;
    const config = PILLAR_CONFIG[pillar as keyof typeof PILLAR_CONFIG];
    if (!config) return <Badge variant="outline">{pillar}</Badge>;
    return (
      <Badge 
        variant="outline" 
        style={{ 
          backgroundColor: `${config.color}15`,
          borderColor: config.color,
          color: config.color 
        }}
      >
        {config.label}
      </Badge>
    );
  };

  // Check if milestone has playbook checklist
  const hasPlaybookChecklist = (milestone: ProjectMilestone) => {
    return !!milestone.playbook_milestone_id;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Marcos do Projeto</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as MilestoneStatus | 'all')}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="flex items-center gap-2">
                      {opt.icon}
                      {opt.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterPillar} onValueChange={setFilterPillar}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Pilar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Pilares</SelectItem>
                {Object.entries(PILLAR_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredMilestones.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum marco encontrado</p>
            <p className="text-sm">Crie um novo marco para começar a planejar o projeto.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="w-[250px]">Marco</TableHead>
                <TableHead>Pilar</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Checklist</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMilestones.map((milestone) => {
                const isOverdue = isMilestoneOverdue(milestone);
                const hasChecklist = hasPlaybookChecklist(milestone);
                const isExpanded = expandedMilestones.has(milestone.id);
                
                return (
                  <Collapsible
                    key={milestone.id}
                    open={isExpanded}
                    onOpenChange={() => hasChecklist && toggleExpanded(milestone.id)}
                    asChild
                  >
                    <>
                      <TableRow className={isOverdue ? 'bg-destructive/5' : ''}>
                        <TableCell className="p-2">
                          {hasChecklist ? (
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          ) : (
                            <div className="w-7" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium flex items-center gap-2">
                              {milestone.milestone_name}
                              {isOverdue && (
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                              )}
                              {hasChecklist && (
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
                                  <BookOpen className="h-3 w-3 mr-1" />
                                  Playbook
                                </Badge>
                              )}
                            </span>
                            {milestone.description && (
                              <span className="text-sm text-muted-foreground line-clamp-1">
                                {milestone.description}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getPillarBadge(milestone.pillar)}
                        </TableCell>
                        <TableCell>
                          {readOnly ? (
                            getStatusBadge(milestone.status)
                          ) : (
                            <Select 
                              value={milestone.status} 
                              onValueChange={(v) => onUpdateStatus(milestone.id, v as MilestoneStatus)}
                            >
                              <SelectTrigger className="w-36 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    <span className="flex items-center gap-2">
                                      {opt.icon}
                                      {opt.label}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 w-32">
                            <Progress value={milestone.progress_percentage} className="h-2" />
                            <span className="text-sm text-muted-foreground w-10">
                              {milestone.progress_percentage}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {hasChecklist ? (
                            <div className="flex items-center gap-2">
                              <ListChecks className="h-4 w-4 text-muted-foreground" />
                              <Progress 
                                value={milestone.progress_percentage} 
                                className="h-2 w-16" 
                              />
                              <span className="text-xs text-muted-foreground">
                                {milestone.progress_percentage}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {milestone.planned_end ? (
                            <span className={`text-sm ${isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                              {formatBRT(new Date(milestone.planned_end), "dd MMM yyyy")}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {readOnly ? null : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => onDeleteMilestone(milestone.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                      
                      {/* Expandable Checklist Row */}
                      {hasChecklist && (
                        <CollapsibleContent asChild>
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableCell colSpan={8} className="p-0">
                              <div className="p-4 border-l-4 border-primary/50">
                                <MilestoneChecklist
                                  projectMilestoneId={milestone.id}
                                  playbookMilestoneId={milestone.playbook_milestone_id}
                                  readOnly={readOnly}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      )}
                    </>
                  </Collapsible>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
