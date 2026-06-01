import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePlaybooks } from '@/hooks/usePlaybooks';
import { useApplyPlaybook } from '@/hooks/useApplyPlaybook';
import { getCategoryLabel, getCategoryColor, formatDuration } from '@/types/playbook.types';
import { addDays } from "date-fns";
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, CheckCircle, Clock, Loader2, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { formatBRT } from "@/lib/datetime";

interface ApplyPlaybookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  onApplied: () => void;
}

export function ApplyPlaybookDialog({ open, onOpenChange, accountId, onApplied }: ApplyPlaybookDialogProps) {
  const { playbooks, loading: loadingPlaybooks } = usePlaybooks();
  const { applyPlaybook, applying } = useApplyPlaybook();
  
  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string>('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  
  // Get only active playbooks
  const activePlaybooks = playbooks.filter(p => p.is_active);
  const selectedPlaybook = activePlaybooks.find(p => p.id === selectedPlaybookId);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedPlaybookId('');
      setStartDate(new Date());
    }
  }, [open]);

  const handleApply = async () => {
    if (!selectedPlaybookId) {
      toast({
        title: 'Selecione um playbook',
        description: 'Você precisa selecionar um playbook para aplicar.',
        variant: 'destructive',
      });
      return;
    }

    const success = await applyPlaybook(accountId, selectedPlaybookId, startDate);
    
    if (success) {
      toast({
        title: 'Playbook aplicado!',
        description: 'Os marcos do projeto foram criados com sucesso.',
      });
      onApplied();
      onOpenChange(false);
    }
  };

  // Calculate preview dates for milestones
  const getPreviewEndDate = () => {
    if (!selectedPlaybook) return null;
    return addDays(startDate, selectedPlaybook.estimated_duration_weeks * 7);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Aplicar Playbook ao Projeto
          </DialogTitle>
          <DialogDescription>
            Selecione um modelo de projeto para gerar automaticamente os marcos e datas planejadas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Playbook Selection */}
          <div className="space-y-2">
            <Label>Playbook</Label>
            {loadingPlaybooks ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={selectedPlaybookId} onValueChange={setSelectedPlaybookId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um playbook..." />
                </SelectTrigger>
                <SelectContent>
                  {activePlaybooks.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Nenhum playbook ativo disponível
                    </div>
                  ) : (
                    activePlaybooks.map((pb) => (
                      <SelectItem key={pb.id} value={pb.id}>
                        <div className="flex items-center gap-2">
                          <span>{pb.name}</span>
                          <Badge 
                            variant="outline" 
                            className="text-xs"
                            style={{
                              backgroundColor: `${getCategoryColor(pb.category)}15`,
                              borderColor: getCategoryColor(pb.category),
                              color: getCategoryColor(pb.category)
                            }}
                          >
                            {getCategoryLabel(pb.category)}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label>Data de Início</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? formatBRT(startDate, "PPP") : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Playbook Preview */}
          {selectedPlaybook && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Resumo do Playbook</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Categoria:</span>
                    <Badge 
                      variant="outline" 
                      className="ml-2"
                      style={{
                        backgroundColor: `${getCategoryColor(selectedPlaybook.category)}15`,
                        borderColor: getCategoryColor(selectedPlaybook.category),
                        color: getCategoryColor(selectedPlaybook.category)
                      }}
                    >
                      {getCategoryLabel(selectedPlaybook.category)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Duração:</span>
                    <span className="font-medium">{formatDuration(selectedPlaybook.estimated_duration_weeks)}</span>
                  </div>
                </div>
                
                {selectedPlaybook.description && (
                  <p className="text-sm text-muted-foreground">
                    {selectedPlaybook.description}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t text-sm">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span>Início: {formatBRT(startDate, "dd/MM/yyyy")}</span>
                  </div>
                  {getPreviewEndDate() && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      <span>Fim previsto: {formatBRT(getPreviewEndDate()!, "dd/MM/yyyy")}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={applying}>
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={applying || !selectedPlaybookId}>
            {applying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Aplicando...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Aplicar Playbook
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
