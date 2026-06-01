import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DevelopmentBadge } from './DevelopmentBadge';
import { DevelopmentProgress } from './DevelopmentProgress';
import { useDevelopment } from '@/contexts/DevelopmentContext';
import { SelectedDevelopmentItem, DEVELOPMENT_CATEGORIES } from '@/types/development.types';
import { toast } from 'sonner';
import { RotateCcw, Download, CheckCircle2, Save, ChevronLeft } from 'lucide-react';
import logoGentia from '@/assets/logo-gentia.png';
import { VersionHistoryCard } from '@/components/cultura/shared/VersionHistoryCard';
import { useJourneyProgress } from '@/hooks/useJourneyProgress';
import { useAchievementChecker } from '@/hooks/useAchievementChecker';
import { useCulturePulseAutoSync } from '@/hooks/useCulturePulseAutoSync';

export function DevelopmentSummary() {
  const { resetSession, getSelections, versionHistory, saveVersionSnapshot, updateStage, restoreVersion } = useDevelopment();
  const { refetch } = useJourneyProgress();
  const { checkStepCompletion } = useAchievementChecker();
  const { triggerSync } = useCulturePulseAutoSync('Desenvolvimento');
  const [selected, setSelected] = useState<SelectedDevelopmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const hasSavedInitial = useRef(false);
  const hasCheckedAchievements = useRef(false);

  // Refetch journey progress and check achievements when summary mounts
  useEffect(() => {
    refetch();
    if (!hasCheckedAchievements.current) {
      hasCheckedAchievements.current = true;
      checkStepCompletion('desenvolvimento');
      triggerSync();
    }
  }, [refetch, checkStepCompletion, triggerSync]);

  useEffect(() => { loadData(); }, []);

  // Auto-save version on first load
  useEffect(() => {
    if (!loading && selected.length > 0 && !hasSavedInitial.current && versionHistory.length === 0) {
      hasSavedInitial.current = true;
      saveVersionSnapshot('initial');
    }
  }, [loading, selected, versionHistory]);

  const loadData = async () => {
    try {
      const phase3 = await getSelections(3);
      setSelected(phase3);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async () => { await resetSession(); toast.info('Processo reiniciado'); };
  const handleSaveVersion = async () => { await saveVersionSnapshot('final'); toast.success('Versão salva!'); };
  const handleExport = () => { toast.info('Funcionalidade de exportação em desenvolvimento'); };

  const groupedItems = DEVELOPMENT_CATEGORIES.map(category => ({
    ...category,
    items: selected.filter(item => item.category === category.id),
  })).filter(group => group.items.length > 0);

  const renderHistoryPreview = (snapshot: unknown) => {
    const s = snapshot as { items?: { label: string; category_label?: string }[] };
    return (
      <span className="text-xs text-muted-foreground">{s.items?.length || 0} rituais selecionados</span>
    );
  };

  const renderDetailedPreview = (snapshot: unknown) => {
    const s = snapshot as { items?: { label: string; category_label?: string }[] };
    if (!s.items || s.items.length === 0) return <span className="text-xs text-muted-foreground">Nenhum item</span>;
    return (
      <div className="space-y-1">
        {s.items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
            <span className="text-foreground">{item.label}</span>
            {item.category_label && <span className="text-muted-foreground">({item.category_label})</span>}
          </div>
        ))}
      </div>
    );
  };

  if (loading) return <div className="text-center py-8">Carregando...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="text-center">
          <img src={logoGentia} alt="Gent.IA" className="h-36 w-auto mx-auto mb-4" />
          <DevelopmentProgress currentStage={5} onStageClick={(s) => updateStage(s)} />
          <div className="flex items-center justify-center gap-2 text-primary mb-2">
            <CheckCircle2 className="h-6 w-6" /><span className="text-lg font-semibold">Concluído!</span>
          </div>
          <CardTitle className="text-2xl">Rituais de Desenvolvimento</CardTitle>
          <CardDescription>Confira abaixo os rituais de desenvolvimento selecionados para sua organização.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {groupedItems.map((group) => (
            <div key={group.id} className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b">
                <span className="text-xl">{group.icon}</span><span className="font-semibold">{group.label}</span>
              </div>
              <div className="space-y-2">
                {group.items.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">{index + 1}</span>
                    <span className="font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-3">Todos os Rituais Selecionados</h3>
            <div className="flex flex-wrap gap-2">
              {selected.map((item) => (<DevelopmentBadge key={item.id} label={item.label} category={item.category} selected />))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button variant="outline" onClick={() => updateStage(4)}><ChevronLeft className="w-4 h-4 mr-1" />Voltar</Button>
          <Button variant="outline" onClick={handleSaveVersion}><Save className="w-4 h-4 mr-1" />Salvar Versão</Button>
          <Button variant="outline" onClick={handleRestart}><RotateCcw className="w-4 h-4 mr-1" />Recomeçar</Button>
          <Button onClick={handleExport} className="flex-1"><Download className="w-4 h-4 mr-1" />Exportar PDF</Button>
        </CardFooter>
      </Card>
      <VersionHistoryCard history={versionHistory} renderPreview={renderHistoryPreview} renderDetailedPreview={renderDetailedPreview} onRestore={restoreVersion} title="Histórico de Versões" />
    </div>
  );
}
