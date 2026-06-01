
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  Linkedin,
  Github,
  Globe,
  RefreshCw,
  MoreVertical,
  Trash2,
  RotateCcw,
  UserPlus,
  StopCircle,
  Ban,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { HuntingSearch } from '@/hooks/useHuntingSearch';
import { formatBRT } from "@/lib/datetime";

interface HuntingSearchCardProps {
  search: HuntingSearch;
  onSelect: (searchId: string) => void;
  isSelected?: boolean;
  onUpdated?: () => void;
  onDelete?: (searchId: string) => Promise<boolean>;
  onRerun?: (searchId: string) => Promise<any>;
  onSearchMore?: (searchId: string, count: number) => Promise<any>;
  onCancel?: (searchId: string) => Promise<boolean>;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  pending: { label: 'Pendente', icon: Clock, color: 'bg-yellow-500/10 text-yellow-600' },
  running: { label: 'Buscando...', icon: Loader2, color: 'bg-blue-500/10 text-blue-600' },
  completed: { label: 'Concluída', icon: CheckCircle2, color: 'bg-green-500/10 text-green-600' },
  failed: { label: 'Falhou', icon: XCircle, color: 'bg-red-500/10 text-red-600' },
  cancelled: { label: 'Cancelada', icon: Ban, color: 'bg-orange-500/10 text-orange-600' },
};

const SOURCE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  linkedin: Linkedin,
  github: Github,
  portfolio: Globe,
};

const SEARCH_MORE_OPTIONS = [5, 10, 15, 20];

export function HuntingSearchCard({ search, onSelect, isSelected, onUpdated, onDelete, onRerun, onSearchMore, onCancel }: HuntingSearchCardProps) {
  const { toast } = useToast();
  const statusConfig = STATUS_CONFIG[search.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;
  const searchAny = search as any;
  const [recurringActive, setRecurringActive] = useState(searchAny.recurring_active || false);
  const [recurringSchedule, setRecurringSchedule] = useState(searchAny.recurring_schedule || '');
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showSearchMoreDialog, setShowSearchMoreDialog] = useState(false);
  const [searchMoreCount, setSearchMoreCount] = useState(10);
  const [isActioning, setIsActioning] = useState(false);

  const handleRecurringToggle = async (enabled: boolean) => {
    try {
      const updates: any = { recurring_active: enabled };
      if (enabled && !recurringSchedule) {
        updates.recurring_schedule = 'daily';
        setRecurringSchedule('daily');
      }
      const { error } = await supabase
        .from('recruitment_hunting_searches')
        .update(updates)
        .eq('id', search.id);
      if (error) throw error;
      setRecurringActive(enabled);
      toast({ title: enabled ? 'Busca recorrente ativada' : 'Busca recorrente desativada' });
      onUpdated?.();
    } catch {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    }
  };

  const handleScheduleChange = async (schedule: string) => {
    try {
      const { error } = await supabase
        .from('recruitment_hunting_searches')
        .update({ recurring_schedule: schedule } as any)
        .eq('id', search.id);
      if (error) throw error;
      setRecurringSchedule(schedule);
      onUpdated?.();
    } catch {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsActioning(true);
    await onDelete(search.id);
    setIsActioning(false);
    setShowDeleteAlert(false);
  };

  const handleRerun = async () => {
    if (!onRerun) return;
    setIsActioning(true);
    await onRerun(search.id);
    setIsActioning(false);
  };

  const handleSearchMore = async () => {
    if (!onSearchMore) return;
    setIsActioning(true);
    await onSearchMore(search.id, searchMoreCount);
    setIsActioning(false);
    setShowSearchMoreDialog(false);
  };

  return (
    <>
      <Card
        className={`cursor-pointer transition-all ${
          isSelected
            ? 'border-primary ring-1 ring-primary'
            : 'hover:border-primary/50'
        }`}
        onClick={() => onSelect(search.id)}
      >
        <CardContent className="p-2.5">
          <div className="flex items-start justify-between gap-1.5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <Search className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="font-medium text-xs truncate">{search.query}</span>
              </div>

              <div className="flex flex-wrap items-center gap-1 mb-1">
                <Badge variant="outline" className={`${statusConfig.color} text-[10px] px-1.5 py-0`}>
                  <StatusIcon className={`h-2.5 w-2.5 mr-0.5 ${search.status === 'running' ? 'animate-spin' : ''}`} />
                  {statusConfig.label}
                </Badge>

                {search.results_count > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {search.results_count}
                  </Badge>
                )}

                {search.status === 'running' && onCancel && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-[10px] text-orange-600 hover:text-orange-700 hover:bg-orange-500/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancel(search.id);
                    }}
                  >
                    <StopCircle className="h-3 w-3 mr-0.5" />
                    Parar
                  </Button>
                )}

                {recurringActive && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[9px] px-1 py-0">
                    <RefreshCw className="h-2 w-2 mr-0.5" />
                    {recurringSchedule === 'daily' ? 'D' : 'S'}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1">
                {search.sources.map((source) => {
                  const Icon = SOURCE_ICONS[source] || Globe;
                  return (
                    <Icon key={source} className="h-3 w-3 text-muted-foreground" />
                  );
                })}
                <span className="text-[10px] text-muted-foreground ml-0.5">
                  {formatBRT(new Date(search.created_at), "dd/MM HH:mm")}
                </span>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                {/* Recurring toggle moved into dropdown */}
                {search.status === 'completed' && search.job_id && (
                  <>
                    <div className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={recurringActive}
                          onCheckedChange={handleRecurringToggle}
                          className="scale-75"
                        />
                        <Label className="text-xs text-muted-foreground cursor-pointer">
                          Recorrente
                        </Label>
                      </div>
                      {recurringActive && (
                        <Select value={recurringSchedule} onValueChange={handleScheduleChange}>
                          <SelectTrigger className="h-6 w-full text-xs mt-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily" className="text-xs">Diária</SelectItem>
                            <SelectItem value="weekly" className="text-xs">Semanal</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}
                {search.status === 'running' && onCancel && (
                  <DropdownMenuItem onClick={() => onCancel(search.id)} className="text-orange-600 focus:text-orange-600">
                    <StopCircle className="h-4 w-4 mr-2" />
                    Parar busca
                  </DropdownMenuItem>
                )}
                {search.status === 'completed' && onSearchMore && (
                  <DropdownMenuItem onClick={() => setShowSearchMoreDialog(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Buscar mais perfis
                  </DropdownMenuItem>
                )}
                {onRerun && (
                  <DropdownMenuItem onClick={handleRerun} disabled={isActioning}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {isActioning ? 'Executando...' : 'Re-executar busca'}
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setShowDeleteAlert(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir busca
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir busca</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta busca e todos os seus resultados?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActioning}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isActioning} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isActioning ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Search more dialog */}
      <Dialog open={showSearchMoreDialog} onOpenChange={setShowSearchMoreDialog}>
        <DialogContent onClick={(e) => e.stopPropagation()} className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Buscar mais perfis</DialogTitle>
            <DialogDescription>
              Quantos perfis adicionais deseja buscar para "{search.query}"?
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2 py-4">
            {SEARCH_MORE_OPTIONS.map((count) => (
              <Button
                key={count}
                variant={searchMoreCount === count ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchMoreCount(count)}
              >
                {count}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSearchMoreDialog(false)} disabled={isActioning}>
              Cancelar
            </Button>
            <Button onClick={handleSearchMore} disabled={isActioning}>
              {isActioning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Buscar {searchMoreCount} perfis
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
