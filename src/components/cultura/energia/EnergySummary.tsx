import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEnergy } from '@/contexts/EnergyContext';
import { ENERGY_CATEGORIES, SelectedEnergyItem } from '@/types/energy.types';
import { EnergyBadge } from './EnergyBadge';
import { EnergyProgress } from './EnergyProgress';
import { useToast } from '@/hooks/use-toast';
import { RefreshCcw, FileDown, Sparkles, Save, Pencil } from 'lucide-react';
import logoGentia from '@/assets/logo-gentia.png';
import { VersionHistoryCard } from '@/components/cultura/shared/VersionHistoryCard';
import { useJourneyProgress } from '@/hooks/useJourneyProgress';
import { useAchievementChecker } from '@/hooks/useAchievementChecker';
import { useCulturePulseAutoSync } from '@/hooks/useCulturePulseAutoSync';

export function EnergySummary() {
  const { resetSession, getSelections, versionHistory, saveVersionSnapshot, updateStage, restoreVersion, updateSelectionLabel } = useEnergy();
  const { refetch } = useJourneyProgress();
  const { checkStepCompletion } = useAchievementChecker();
  const { triggerSync } = useCulturePulseAutoSync('Energia');
  const { toast } = useToast();
  const [selected, setSelected] = useState<SelectedEnergyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const hasSavedInitial = useRef(false);
  const hasCheckedAchievements = useRef(false);

  useEffect(() => {
    refetch();
    if (!hasCheckedAchievements.current) {
      hasCheckedAchievements.current = true;
      checkStepCompletion('energia');
      triggerSync();
    }
  }, [refetch, checkStepCompletion, triggerSync]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!loading && selected.length > 0 && !hasSavedInitial.current && versionHistory.length === 0) {
      hasSavedInitial.current = true;
      saveVersionSnapshot('initial');
    }
  }, [loading, selected, versionHistory]);

  const loadData = async () => {
    try {
      const selections = await getSelections(3);
      setSelected(selections);
    } catch (error) {
      console.error('Error loading selections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (itemId: string, newLabel: string) => {
    const success = await updateSelectionLabel(3, itemId, newLabel);
    if (success) {
      setSelected(prev => prev.map(s => s.id === itemId ? { ...s, label: newLabel } : s));
      toast({ title: "Ritual atualizado!" });
    } else {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const handleRestart = async () => {
    await resetSession();
    toast({ title: "Processo reiniciado", description: "Você pode começar a seleção novamente." });
  };

  const handleSaveVersion = async () => {
    await saveVersionSnapshot('final');
    toast({ title: "Versão salva!", description: "O histórico foi atualizado." });
  };

  const handleExport = () => {
    toast({ title: "Em desenvolvimento", description: "A exportação para PDF estará disponível em breve." });
  };

  const groupedItems = ENERGY_CATEGORIES.map(cat => ({
    ...cat,
    items: selected.filter(item => item.category === cat.id),
  })).filter(cat => cat.items.length > 0);

  const renderHistoryPreview = (snapshot: unknown) => {
    const s = snapshot as { items?: { label: string }[] };
    return <span className="text-xs text-muted-foreground">{s.items?.length || 0} rituais selecionados</span>;
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
          </div>
        ))}
      </div>
    );
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-none">
        <CardHeader className="text-center">
          <img src={logoGentia} alt="Gent.IA" className="h-36 w-auto mx-auto mb-4" />
          <EnergyProgress currentStage={5} onStageClick={(stage) => updateStage(stage)} />
          <div className="flex items-center justify-center gap-2 text-primary">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-medium">Rituais definidos com sucesso!</span>
          </div>
          <CardTitle className="text-xl mt-2">Rituais de Energia</CardTitle>
          <CardDescription>Seus rituais de energia organizacional estão prontos. Clique no lápis para editar nomes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {groupedItems.map(category => (
            <div key={category.id}>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span>{category.icon}</span>{category.label}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {category.items.map(item => (
                  <EnergyBadge
                    key={item.id}
                    label={item.label}
                    category={item.category}
                    selected={true}
                    isCustom={item.id.startsWith('custom_')}
                    onEdit={(newLabel) => handleEdit(item.id, newLabel)}
                  />
                ))}
              </div>
            </div>
          ))}
          <div className="bg-muted/50 rounded-lg p-4 mt-6">
            <h4 className="font-semibold text-sm mb-2">Todos os Rituais Selecionados</h4>
            <div className="flex flex-wrap gap-2">
              {selected.map(item => (
                <span key={item.id} className="px-3 py-1 bg-background border border-border rounded-full text-xs">
                  {item.id.startsWith('custom_') && '✨ '}{item.label}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center gap-4 flex-wrap">
          <Button variant="outline" onClick={() => updateStage(3)}><Pencil className="w-4 h-4 mr-2" />Editar Seleção</Button>
          <Button variant="outline" onClick={handleSaveVersion}><Save className="w-4 h-4 mr-2" />Salvar Versão</Button>
          <Button variant="outline" onClick={handleRestart}><RefreshCcw className="w-4 h-4 mr-2" />Recomeçar</Button>
          <Button onClick={handleExport}><FileDown className="w-4 h-4 mr-2" />Exportar PDF</Button>
        </CardFooter>
      </Card>
      <VersionHistoryCard history={versionHistory} renderPreview={renderHistoryPreview} renderDetailedPreview={renderDetailedPreview} onRestore={restoreVersion} title="Histórico de Versões" />
    </div>
  );
}
