import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ValueBadge } from './ValueBadge';
import { useValues } from '@/contexts/ValuesContext';
import { supabase } from '@/integrations/supabase/client';
import { SelectedValue } from '@/types/values.types';
import { Download, Home, ChevronLeft, Pencil, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { VersionHistoryCard } from '../shared/VersionHistoryCard';
import { useJourneyProgress } from '@/hooks/useJourneyProgress';
import { useCulturePulseAutoSync } from '@/hooks/useCulturePulseAutoSync';

interface BehaviorSelection {
  value_label: string;
  do_selected: string[];
  dont_selected: string[];
}

interface EditingBehavior {
  valueLabel: string;
  type: 'do' | 'dont';
  index: number;
  text: string;
}

interface ValuesSummaryProps {
  skipBehaviors?: boolean;
}

export function ValuesSummary({ skipBehaviors = false }: ValuesSummaryProps = {}) {
  const { getSelections, session, updateStage, versionHistory, saveVersionSnapshot, restoreVersion } = useValues();
  const { refetch } = useJourneyProgress();
  const { triggerSync } = useCulturePulseAutoSync('Valores');
  const navigate = useNavigate();
  const [values, setValues] = useState<SelectedValue[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [userName, setUserName] = useState('');
  const [behaviors, setBehaviors] = useState<BehaviorSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const hasSavedInitial = useRef(false);
  const hasSynced = useRef(false);
  
  // Editing states
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [editValueText, setEditValueText] = useState('');
  const [editingBehavior, setEditingBehavior] = useState<EditingBehavior | null>(null);

  // Refetch journey progress and auto-sync when summary mounts
  useEffect(() => {
    refetch();
    if (!hasSynced.current) {
      hasSynced.current = true;
      triggerSync();
    }
  }, [refetch, triggerSync]);

  useEffect(() => {
    loadData();
  }, []);

  // Auto-save version on first load
  useEffect(() => {
    if (!loading && behaviors.length > 0 && !hasSavedInitial.current && versionHistory.length === 0) {
      hasSavedInitial.current = true;
      saveVersionSnapshot('initial');
    }
  }, [loading, behaviors, versionHistory]);

  const loadData = async () => {
    if (!session) {
      setLoading(false);
      return;
    }

    try {
      const phase3Values = await getSelections(3);
      setValues(phase3Values);

      const { data: companyData } = await supabase
        .from('values_company_info')
        .select('*')
        .eq('session_id', session.id)
        .maybeSingle();

      if (companyData) {
        setCompanyName(companyData.company_name);
        setUserName(companyData.user_name);
      } else {
        setCompanyName('Sua Empresa');
        setUserName('Responsável');
      }

      const { data: behaviorsData } = await supabase
        .from('values_behaviors_selections')
        .select('*')
        .eq('session_id', session.id);

      if (behaviorsData) {
        setBehaviors(behaviorsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados dos valores');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleBack = async () => {
    await updateStage(skipBehaviors ? 7 : 8);
  };

  // Value name editing
  const handleEditValue = (valueLabel: string) => {
    setEditingValue(valueLabel);
    setEditValueText(valueLabel);
  };

  const handleCancelValueEdit = () => {
    setEditingValue(null);
    setEditValueText('');
  };

  const handleSaveValueEdit = async () => {
    if (!editingValue || !session) return;

    try {
      // Update in values_behaviors_options
      await supabase
        .from('values_behaviors_options')
        .update({ value_label: editValueText })
        .eq('session_id', session.id)
        .eq('value_label', editingValue);

      // Update in values_behaviors_selections
      await supabase
        .from('values_behaviors_selections')
        .update({ value_label: editValueText })
        .eq('session_id', session.id)
        .eq('value_label', editingValue);

      // Update local state
      setBehaviors(behaviors.map(b =>
        b.value_label === editingValue ? { ...b, value_label: editValueText } : b
      ));

      toast.success('Valor atualizado!');
      setEditingValue(null);
      setEditValueText('');
    } catch (error) {
      console.error('Error updating value:', error);
      toast.error('Erro ao atualizar valor');
    }
  };

  // Behavior text editing
  const handleEditBehavior = (valueLabel: string, type: 'do' | 'dont', index: number, currentText: string) => {
    setEditingBehavior({ valueLabel, type, index, text: currentText });
  };

  const handleCancelBehaviorEdit = () => {
    setEditingBehavior(null);
  };

  const handleSaveBehaviorEdit = async () => {
    if (!editingBehavior || !session) return;

    const behavior = behaviors.find(b => b.value_label === editingBehavior.valueLabel);
    if (!behavior) return;

    try {
      const updatedArray = editingBehavior.type === 'do'
        ? [...behavior.do_selected]
        : [...behavior.dont_selected];

      updatedArray[editingBehavior.index] = editingBehavior.text;

      await supabase
        .from('values_behaviors_selections')
        .update(
          editingBehavior.type === 'do'
            ? { do_selected: updatedArray }
            : { dont_selected: updatedArray }
        )
        .eq('session_id', session.id)
        .eq('value_label', editingBehavior.valueLabel);

      // Update local state
      setBehaviors(behaviors.map(b =>
        b.value_label === editingBehavior.valueLabel
          ? {
              ...b,
              [editingBehavior.type === 'do' ? 'do_selected' : 'dont_selected']: updatedArray
            }
          : b
      ));

      toast.success('Comportamento atualizado!');
      setEditingBehavior(null);
    } catch (error) {
      console.error('Error updating behavior:', error);
      toast.error('Erro ao atualizar comportamento');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  if (!session) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Sessão não encontrada.</p>
            <p className="text-sm text-muted-foreground">
              Verifique se sua empresa está configurada corretamente.
            </p>
            <Button variant="outline" onClick={() => navigate('/minha-empresa')}>
              Configurar Empresa
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (behaviors.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Nenhum valor definido ainda.</p>
            <p className="text-sm text-muted-foreground">
              Complete as etapas anteriores para ver o resumo dos valores.
            </p>
            <Button variant="outline" onClick={() => updateStage(1)}>
              Iniciar Seleção de Valores
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="print:shadow-none">
      <CardHeader>
        <CardTitle className="text-2xl">Valores Organizacionais</CardTitle>
        <CardDescription>
          {companyName} - Elaborado por {userName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold mb-3">Nossos Valores:</h3>
          <div className="flex flex-wrap gap-2">
            {behaviors.map((behavior) => (
              <div key={behavior.value_label} className="flex items-center gap-1">
                {editingValue === behavior.value_label ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={editValueText}
                      onChange={(e) => setEditValueText(e.target.value)}
                      className="h-8 w-40"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={handleSaveValueEdit}
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={handleCancelValueEdit}
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <ValueBadge
                      label={behavior.value_label}
                      selected={true}
                      className="text-base px-6 py-3"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 print:hidden"
                      onClick={() => handleEditValue(behavior.value_label)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {behaviors.map((behavior) => (
            <div key={behavior.value_label} className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-semibold">{behavior.value_label}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-green-600 dark:text-green-400 mb-2">
                    ✓ COMO VIVEMOS
                  </h4>
                  <ul className="space-y-2">
                    {behavior.do_selected.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 group">
                        {editingBehavior?.valueLabel === behavior.value_label &&
                         editingBehavior?.type === 'do' &&
                         editingBehavior?.index === idx ? (
                          <div className="flex items-center gap-1 flex-1">
                            <Input
                              value={editingBehavior.text}
                              onChange={(e) => setEditingBehavior({ ...editingBehavior, text: e.target.value })}
                              className="h-8 text-sm"
                              autoFocus
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 flex-shrink-0"
                              onClick={handleSaveBehaviorEdit}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 flex-shrink-0"
                              onClick={handleCancelBehaviorEdit}
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className="text-sm flex-1">• {item}</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity print:hidden flex-shrink-0"
                              onClick={() => handleEditBehavior(behavior.value_label, 'do', idx, item)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-red-600 dark:text-red-400 mb-2">
                    ✗ COMO NÃO VIVEMOS
                  </h4>
                  <ul className="space-y-2">
                    {behavior.dont_selected.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 group">
                        {editingBehavior?.valueLabel === behavior.value_label &&
                         editingBehavior?.type === 'dont' &&
                         editingBehavior?.index === idx ? (
                          <div className="flex items-center gap-1 flex-1">
                            <Input
                              value={editingBehavior.text}
                              onChange={(e) => setEditingBehavior({ ...editingBehavior, text: e.target.value })}
                              className="h-8 text-sm"
                              autoFocus
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 flex-shrink-0"
                              onClick={handleSaveBehaviorEdit}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 flex-shrink-0"
                              onClick={handleCancelBehaviorEdit}
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className="text-sm flex-1">• {item}</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity print:hidden flex-shrink-0"
                              onClick={() => handleEditBehavior(behavior.value_label, 'dont', idx, item)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-sm text-muted-foreground text-center pt-4 border-t print:block hidden">
          Documento gerado em {new Date().toLocaleDateString('pt-BR')}
        </div>

        {/* Version History */}
        <VersionHistoryCard
          history={versionHistory}
          renderPreview={(snapshot) => {
            const data = snapshot as { values?: (string | { id: string; label: string })[]; behaviors?: BehaviorSelection[] };
            const valuesCount = data.values?.length || 0;
            const behaviorsCount = data.behaviors?.length || 0;
            return <span className="text-xs text-muted-foreground">{valuesCount} valores • {behaviorsCount} comportamentos</span>;
          }}
          renderDetailedPreview={(snapshot) => {
            const data = snapshot as { values?: (string | { id: string; label: string })[]; behaviors?: BehaviorSelection[] };
            return (
              <div className="space-y-2">
                {data.values && data.values.length > 0 && (
                  <div>
                    <span className="text-xs font-medium">Valores:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {data.values.map((v, i) => (
                        <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded">
                          {typeof v === 'string' ? v : v.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {data.behaviors && data.behaviors.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium">Comportamentos:</span>
                    {data.behaviors.map((b, i) => (
                      <div key={i} className="text-xs">
                        <span className="font-medium text-foreground">{b.value_label}:</span>
                        <span className="text-muted-foreground ml-1">{b.do_selected?.length || 0} fazer, {b.dont_selected?.length || 0} não fazer</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          }}
          onRestore={restoreVersion}
        />
      </CardContent>
      <CardFooter className="flex gap-2 print:hidden">
        <Button
          variant="outline"
          onClick={handleBack}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Voltar
        </Button>
        <Button
          variant="outline"
          onClick={handleGoHome}
        >
          <Home className="w-4 h-4 mr-1" />
          Início
        </Button>
        <Button
          onClick={handlePrint}
          className="flex-1"
        >
          <Download className="w-4 h-4 mr-1" />
          Imprimir / Salvar PDF
        </Button>
      </CardFooter>
    </Card>
  );
}
