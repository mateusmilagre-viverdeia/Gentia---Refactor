import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Clock, Copy, Check, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatBRTRelative } from "@/lib/datetime";

export interface VersionHistoryItem {
  id: string;
  snapshot: unknown;
  variant: string;
  created_at: string;
}

interface VersionHistoryCardProps {
  history: VersionHistoryItem[];
  renderPreview: (snapshot: unknown) => React.ReactNode;
  renderDetailedPreview?: (snapshot: unknown) => React.ReactNode;
  onCopySnapshot?: (snapshot: unknown) => void;
  onRestore?: (versionId: string) => void;
  title?: string;
  emptyMessage?: string;
}

const variantLabels: Record<string, string> = {
  original: 'Original',
  edit: 'Edição',
  alternative: 'Alternativa',
  update: 'Atualização',
  final: 'Final',
  initial: 'Inicial',
  regenerate: 'Regeneração',
  auto: 'Auto-save',
  manual: 'Manual',
  before_restore: 'Antes de Restaurar',
  backup_before_reset: 'Backup (Reset)',
  step_questionario: 'Questionário Completo',
  step_missao_final: 'Missão Finalizada',
  step_visao_final: 'Visão Finalizada',
  step_selecao_valores: 'Seleção de Valores',
  step_valores_aprovados: 'Valores Aprovados',
  step_valores_finalizados: 'Valores Finalizados',
  step_revisao_decisoes: 'Revisão de Decisões',
  step_decisoes_finalizadas: 'Decisões Finalizadas',
  step_pilar_1: 'Pilar 1 Completo',
  step_pilar_2: 'Pilar 2 Completo',
  step_pilar_3: 'Pilar 3 Completo',
  step_pilar_4: 'Pilar 4 Completo',
  step_pilar_5: 'Pilar 5 Completo',
  step_pilar_6: 'Pilar 6 Completo',
  step_pilar_7: 'Pilar 7 Completo',
  step_pilar_8: 'Pilar 8 Completo',
  step_pilar_9: 'Pilar 9 Completo',
  step_revisao_rituais: 'Revisão de Rituais',
  step_rituais_finalizados: 'Rituais Finalizados',
  step_rituais_gestao: 'Rituais de Gestão',
  step_recomendacoes_ia: 'Recomendações IA',
  step_analise_final: 'Análise Final',
  step_revisao_evento: 'Revisão de Evento',
  step_evento_finalizado: 'Evento Finalizado',
  step_selecao_10: 'Seleção de 10 Rituais',
  step_selecao_5: 'Seleção de 5 Rituais',
  step_aprovacao_energia: 'Aprovação de Energia',
  step_energia_finalizada: 'Energia Finalizada',
  step_selecao_10_dev: 'Seleção de 10 Rituais',
  step_selecao_5_dev: 'Seleção de 5 Rituais',
  step_aprovacao_dev: 'Aprovação',
  step_desenvolvimento_finalizado: 'Desenvolvimento Finalizado',
  step_selecao_perspectivas: 'Seleção por Perspectiva',
  step_kpis_finalizados: 'KPIs Finalizados',
  step_revisao_perguntas: 'Revisão de Perguntas',
  step_perguntas_finalizadas: 'Perguntas Finalizadas',
};

export function VersionHistoryCard({
  history,
  renderPreview,
  renderDetailedPreview,
  onCopySnapshot,
  onRestore,
  title = 'Histórico de Versões',
  emptyMessage = 'Nenhuma versão salva ainda.',
}: VersionHistoryCardProps) {
  const [isOpen, setIsOpen] = useState(history.length > 0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleCopy = (item: VersionHistoryItem) => {
    if (onCopySnapshot) {
      onCopySnapshot(item.snapshot);
    }
    setCopiedId(item.id);
    toast.success('Versão copiada!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    return formatBRTRelative(new Date(dateStr));
  };

  if (history.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader className="py-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4 text-center text-muted-foreground text-sm">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {title}
                <span className="text-xs text-muted-foreground">
                  ({history.length} versão{history.length !== 1 ? 's' : ''})
                </span>
              </div>
              {isOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0">
            {history.map((item, index) => {
              const isExpanded = expandedId === item.id;
              const hasDetailedPreview = !!renderDetailedPreview;

              return (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border bg-muted/30 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Versão {history.length - index}
                      </span>
                      <span>•</span>
                      <span>{variantLabels[item.variant] || item.variant}</span>
                      <span>•</span>
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {hasDetailedPreview && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          title={isExpanded ? 'Recolher' : 'Ver detalhes'}
                        >
                          {isExpanded ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </Button>
                      )}
                      {onRestore && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 px-2" title="Restaurar versão">
                              <RotateCcw className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Restaurar versão?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Isso substituirá os dados atuais pela versão selecionada.
                                Uma versão dos dados atuais será salva automaticamente antes da restauração.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onRestore(item.id)}>
                                Restaurar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      {onCopySnapshot && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => handleCopy(item)}
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Summary preview (always visible) */}
                  <div className="text-sm">{renderPreview(item.snapshot)}</div>
                  
                  {/* Detailed preview (expandable) */}
                  {isExpanded && renderDetailedPreview && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      {renderDetailedPreview(item.snapshot)}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
