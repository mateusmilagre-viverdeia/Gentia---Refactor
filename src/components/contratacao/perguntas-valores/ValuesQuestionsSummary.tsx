import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Download, Copy, FileText, MessageCircle, Target, Sparkles, Check, Home } from 'lucide-react';
import { useValuesQuestions } from '@/contexts/ValuesQuestionsContext';
import { ValuesQuestionsProgress } from './ValuesQuestionsProgress';
import { VersionHistoryCard } from '@/components/cultura/shared/VersionHistoryCard';
import { useToast } from '@/hooks/use-toast';
import { formatBRT } from "@/lib/datetime";


export function ValuesQuestionsSummary() {
  const { 
    session, 
    items, 
    updateStage, 
    saveVersionSnapshot,
    loadVersionHistory,
    restoreVersion,
    versionHistory 
  } = useValuesQuestions();
  const { toast } = useToast();
  const navigate = useNavigate();
  const hasSavedInitial = useRef(false);

  useEffect(() => {
    loadVersionHistory();
  }, [loadVersionHistory]);

  // Auto-save version on first load
  useEffect(() => {
    if (!hasSavedInitial.current && items.length > 0) {
      hasSavedInitial.current = true;
      saveVersionSnapshot('auto');
    }
  }, [items, saveVersionSnapshot]);

  const getStageLabel = (stageNumber: number) => {
    switch (stageNumber) {
      case 1: return 'Perguntas Iniciais';
      case 2: return 'Coringas Iniciais';
      case 3: return 'Por Valor';
      case 4: return 'Coringas Finais';
      default: return '';
    }
  };

  const getStageIcon = (stageNumber: number) => {
    switch (stageNumber) {
      case 1: return <FileText className="h-4 w-4" />;
      case 2: return <MessageCircle className="h-4 w-4" />;
      case 3: return <Target className="h-4 w-4" />;
      case 4: return <Sparkles className="h-4 w-4" />;
      default: return null;
    }
  };

  // Sort items by stage then position
  const sortedItems = [...items].sort((a, b) => {
    if (a.stage_number !== b.stage_number) {
      return a.stage_number - b.stage_number;
    }
    return (a.position || 0) - (b.position || 0);
  });

  // Group by stage
  const groupedItems: Record<number, typeof items> = {};
  sortedItems.forEach(item => {
    if (!groupedItems[item.stage_number]) {
      groupedItems[item.stage_number] = [];
    }
    groupedItems[item.stage_number].push(item);
  });

  const handleCopy = () => {
    let text = 'QUESTIONÁRIO DE CONTRATAÇÃO BASEADO EM VALORES\n\n';
    
    [1, 2, 3, 4].forEach(stage => {
      if (groupedItems[stage]?.length) {
        text += `--- ${getStageLabel(stage).toUpperCase()} ---\n\n`;
        groupedItems[stage].forEach((item, idx) => {
          if (item.value_label) {
            text += `[${item.value_label}] `;
          }
          text += `${idx + 1}. ${item.question_text}\n\n`;
        });
        text += '\n';
      }
    });

    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado!',
      description: 'Questionário copiado para a área de transferência'
    });
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleSaveVersion = async () => {
    await saveVersionSnapshot('manual');
  };

  const handleCopySnapshot = (snapshot: unknown) => {
    const data = snapshot as { items?: any[]; working_values?: string[] };
    let text = 'QUESTIONÁRIO DE CONTRATAÇÃO BASEADO EM VALORES\n\n';
    
    const snapshotItems = data.items || [];
    const grouped: Record<number, any[]> = {};
    snapshotItems.forEach(item => {
      if (!grouped[item.stage_number]) {
        grouped[item.stage_number] = [];
      }
      grouped[item.stage_number].push(item);
    });

    [1, 2, 3, 4].forEach(stage => {
      if (grouped[stage]?.length) {
        text += `--- ${getStageLabel(stage).toUpperCase()} ---\n\n`;
        grouped[stage].forEach((item, idx) => {
          if (item.value_label) {
            text += `[${item.value_label}] `;
          }
          text += `${idx + 1}. ${item.question_text}\n\n`;
        });
        text += '\n';
      }
    });

    navigator.clipboard.writeText(text);
  };

  const handleRestore = async (versionId: string) => {
    await restoreVersion(versionId);
  };

  const renderHistoryPreview = (snapshot: unknown) => {
    const data = snapshot as { items?: any[]; working_values?: string[] };
    const count = data.items?.length || 0;
    return <span className="text-muted-foreground">{count} perguntas</span>;
  };

  // Map version history to VersionHistoryCard format
  const historyForCard = versionHistory.map(v => ({
    id: v.id,
    snapshot: v.snapshot,
    variant: v.variant || 'manual',
    created_at: v.created_at
  }));

  return (
    <div className="space-y-6">
      <ValuesQuestionsProgress 
        currentStage={6} 
        totalValueStages={session?.working_values?.length || 0}
        maxReachedStage={session?.stage}
        onStageClick={updateStage}
      />

      <Card className="print:shadow-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                Questionário de Contratação
              </CardTitle>
              <CardDescription>
                {sortedItems.length} perguntas • Criado em {formatBRT(new Date(), "d 'de' MMMM 'de' yyyy")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {[1, 2, 3, 4].map(stageNum => {
            const stageItems = groupedItems[stageNum];
            if (!stageItems?.length) return null;

            return (
              <div key={stageNum} className="space-y-3">
                <div className="flex items-center gap-2">
                  {getStageIcon(stageNum)}
                  <h3 className="font-semibold text-lg">{getStageLabel(stageNum)}</h3>
                  <Badge variant="secondary">{stageItems.length}</Badge>
                </div>
                <div className="space-y-2 pl-6">
                  {stageItems.map((item, idx) => (
                    <div key={item.id} className="flex items-start gap-2">
                      <span className="text-muted-foreground text-sm w-6 flex-shrink-0">
                        {idx + 1}.
                      </span>
                      <div className="flex-1">
                        {item.value_label && (
                          <Badge variant="outline" className="mr-2 mb-1">
                            {item.value_label}
                          </Badge>
                        )}
                        <span className="text-sm">{item.question_text}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Version History */}
      <div className="print:hidden">
        <VersionHistoryCard
          history={historyForCard}
          renderPreview={renderHistoryPreview}
          onCopySnapshot={handleCopySnapshot}
          onRestore={handleRestore}
          title="Histórico de Versões"
          emptyMessage="Nenhuma versão salva ainda."
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap justify-between gap-4 print:hidden">
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => navigate('/atracao-contratacao/contratacao')}>
            <Home className="h-4 w-4 mr-2" />
            Voltar para Contratação
          </Button>
          <Button variant="outline" onClick={() => updateStage(5)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Editar Perguntas
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSaveVersion}>
            Salvar Versão
          </Button>
          <Button variant="outline" onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-2" />
            Copiar
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
