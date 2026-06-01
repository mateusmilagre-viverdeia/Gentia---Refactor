import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, RefreshCw, Search, Sparkles, Leaf, Zap } from 'lucide-react';
import type { PulseQuestion, PulseDriver, PulseEmojiSet, AnswerType } from '@/types/pulse.types';
import { PILLAR_LABELS, type CulturePillar } from '@/types/pulseCulture.types';

type QuestionFilterType = 'all' | 'regular' | 'culture';

interface Props {
  questions: PulseQuestion[];
  drivers: PulseDriver[];
  emojiSets: PulseEmojiSet[];
  loading: boolean;
  onCreate: (question: Partial<PulseQuestion>) => Promise<any>;
  onUpdate: (id: string, updates: Partial<PulseQuestion>) => Promise<void>;
  onToggle: (id: string, isActive: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRefresh: (filters?: any) => void;
}

interface FormData {
  driver_id: string;
  pillar_type: string;
  question_text: string;
  answer_type: AnswerType;
  emoji_set_id: string;
  max_repeat_per_month: number;
  is_anonymous: boolean;
}

const PILLAR_BADGE_VARIANTS: Record<string, string> = {
  mission: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  vision: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  value: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  decision: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  indicator: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800',
  project: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-800',
  energy: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  development: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
};

export function PulseAdminQuestions({
  questions,
  drivers,
  emojiSets,
  loading,
  onCreate,
  onUpdate,
  onToggle,
  onDelete,
  onRefresh,
}: Props) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<QuestionFilterType>('all');
  const [filterDriver, setFilterDriver] = useState<string>('all');
  const [filterPillar, setFilterPillar] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<PulseQuestion | null>(null);
  const [formData, setFormData] = useState<FormData>({
    driver_id: '',
    pillar_type: '',
    question_text: '',
    answer_type: 'emoji_scale',
    emoji_set_id: '',
    max_repeat_per_month: 2,
    is_anonymous: false,
  });
  const [saving, setSaving] = useState(false);
  const [batchActivating, setBatchActivating] = useState(false);

  const activeDrivers = drivers.filter(d => d.is_active);

  // Count stats
  const regularCount = questions.filter(q => !q.is_culture_question).length;
  const cultureCount = questions.filter(q => q.is_culture_question).length;

  const filteredQuestions = questions.filter(q => {
    if (search && !q.question_text.toLowerCase().includes(search.toLowerCase())) return false;
    
    // Type filter
    if (filterType === 'regular' && q.is_culture_question) return false;
    if (filterType === 'culture' && !q.is_culture_question) return false;
    
    // Driver filter (only for regular questions)
    if (filterDriver !== 'all' && !q.is_culture_question && q.driver_id !== filterDriver) return false;
    
    // Pillar filter (only for culture questions)
    if (filterPillar !== 'all' && q.is_culture_question && q.pillar_type !== filterPillar) return false;
    
    // Active filter
    if (filterActive === 'active' && !q.is_active) return false;
    if (filterActive === 'inactive' && q.is_active) return false;
    
    return true;
  });

  // Calculate inactive questions in current filter for batch activation
  const inactiveInFilter = filterType === 'culture' && filterPillar !== 'all'
    ? questions.filter(q => q.is_culture_question && q.pillar_type === filterPillar && !q.is_active).length
    : 0;

  const handleBatchActivate = async () => {
    if (inactiveInFilter === 0) return;
    setBatchActivating(true);
    try {
      const inactiveQuestions = questions.filter(
        q => q.is_culture_question && q.pillar_type === filterPillar && !q.is_active
      );
      for (const q of inactiveQuestions) {
        await onToggle(q.id, true);
      }
    } finally {
      setBatchActivating(false);
    }
  };

  const openCreate = () => {
    setEditingQuestion(null);
    setFormData({
      driver_id: activeDrivers[0]?.id || '',
      pillar_type: '',
      question_text: '',
      answer_type: 'emoji_scale',
      emoji_set_id: emojiSets.find(s => s.is_default)?.id || '',
      max_repeat_per_month: 2,
      is_anonymous: false,
    });
    setDialogOpen(true);
  };

  const openEdit = (question: PulseQuestion) => {
    setEditingQuestion(question);
    setFormData({
      driver_id: question.driver_id || '',
      pillar_type: question.pillar_type || '',
      question_text: question.question_text,
      answer_type: question.answer_type,
      emoji_set_id: question.emoji_set_id || '',
      max_repeat_per_month: question.max_repeat_per_month,
      is_anonymous: question.is_anonymous,
    });
    setDialogOpen(true);
  };

  // Detect if selected driver is culture
  const selectedDriver = drivers.find(d => d.id === formData.driver_id);
  const isCultureDriver = selectedDriver?.key === 'culture_pulse';

  const handleSave = async () => {
    if (!formData.question_text.trim() || !formData.driver_id) return;
    if (isCultureDriver && !formData.pillar_type) return;
    setSaving(true);
    try {
      const saveData: any = {
        ...formData,
        emoji_set_id: formData.emoji_set_id || null,
      };
      if (editingQuestion) {
        await onUpdate(editingQuestion.id, saveData);
      } else {
        await onCreate(saveData);
      }
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover esta pergunta?')) {
      await onDelete(id);
    }
  };

  const getDriverName = (driverId: string | null) => {
    if (!driverId) return 'Sem driver';
    return drivers.find(d => d.id === driverId)?.name || 'Driver';
  };

  const getPillarLabel = (pillarType?: string) => {
    if (!pillarType) return 'Cultura';
    return PILLAR_LABELS[pillarType as CulturePillar] || pillarType;
  };

  const getPillarBadgeClass = (pillarType?: string) => {
    return PILLAR_BADGE_VARIANTS[pillarType || ''] || 'bg-primary/10 text-primary';
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Banco de Perguntas</CardTitle>
            <CardDescription>
              Gerencie as perguntas disponíveis para o pulso diário
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => onRefresh()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={openCreate} size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Nova Pergunta
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Type Filter Tabs */}
          <div className="flex items-center gap-2 border-b pb-3">
            <Button
              variant={filterType === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => { setFilterType('all'); setFilterPillar('all'); setFilterDriver('all'); }}
            >
              Todas ({questions.length})
            </Button>
            <Button
              variant={filterType === 'regular' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => { setFilterType('regular'); setFilterPillar('all'); }}
            >
              Regulares ({regularCount})
            </Button>
            <Button
              variant={filterType === 'culture' ? 'default' : 'ghost'}
              size="sm"
              className="gap-1"
              onClick={() => { setFilterType('culture'); setFilterDriver('all'); }}
            >
              <Leaf className="h-3.5 w-3.5" />
              Cultura ({cultureCount})
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar perguntas..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Driver filter - only for regular/all */}
            {filterType !== 'culture' && (
              <Select value={filterDriver} onValueChange={setFilterDriver}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por driver" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os drivers</SelectItem>
                  {drivers.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Pillar filter - only for culture/all */}
            {filterType !== 'regular' && (
              <Select value={filterPillar} onValueChange={setFilterPillar}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por pilar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os pilares</SelectItem>
                  {Object.entries(PILLAR_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={filterActive} onValueChange={setFilterActive}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>

            {/* Batch activate button for culture pillar */}
            {inactiveInFilter > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBatchActivate}
                disabled={batchActivating}
                className="gap-1 whitespace-nowrap"
              >
                <Zap className="h-3.5 w-3.5" />
                {batchActivating ? 'Ativando...' : `Ativar ${inactiveInFilter} perguntas`}
              </Button>
            )}
          </div>

          {/* Questions List */}
          {loading && questions.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhuma pergunta encontrada.</p>
              <p className="text-sm mt-1">
                {filterType === 'culture' 
                  ? 'Sincronize as perguntas de cultura na aba Config.' 
                  : 'Crie uma nova pergunta ou ajuste os filtros.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuestions.map(question => {
                const isSystemQuestion = question.account_id === null;
                const isCulture = question.is_culture_question;

                return (
                  <div
                    key={question.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                      question.is_active ? 'bg-card' : 'bg-muted/50 opacity-75'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium leading-snug">{question.question_text}</p>
                      {isCulture && question.reference_text && (
                        <p className="text-xs text-muted-foreground mt-1 italic line-clamp-1">
                          Ref: {question.reference_text}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {isCulture ? (
                          <>
                            <Badge variant="outline" className="gap-1 bg-primary/5 text-primary border-primary/20">
                              <Leaf className="h-3 w-3" />
                              Cultura
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={getPillarBadgeClass(question.pillar_type)}
                            >
                              {getPillarLabel(question.pillar_type)}
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                              <Sparkles className="h-3 w-3" />
                              IA
                            </Badge>
                          </>
                        ) : (
                          <>
                            {isSystemQuestion ? (
                              <Badge variant="default" className="bg-blue-500/10 text-blue-600 border-blue-200">
                                🏢 Sistema
                              </Badge>
                            ) : (
                              <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-200">
                                🏠 Customizada
                              </Badge>
                            )}
                            <Badge variant="outline">{getDriverName(question.driver_id)}</Badge>
                            <Badge variant="secondary">
                              {question.answer_type === 'emoji_scale' ? '😊 Escala' : '✅ Multi'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Max {question.max_repeat_per_month}x/mês
                            </span>
                            {question.ai_generated && (
                              <Badge variant="outline" className="gap-1">
                                <Sparkles className="h-3 w-3" />
                                IA
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={question.is_active}
                        onCheckedChange={(checked) => onToggle(question.id, checked)}
                      />
                      {/* Edit button: only for regular custom questions */}
                      {!isCulture && !isSystemQuestion && (
                        <button
                          onClick={() => openEdit(question)}
                          className="p-2 hover:bg-accent rounded"
                          title="Editar pergunta"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {/* Delete button: available for custom questions AND culture questions */}
                      {!isSystemQuestion && (
                        <button
                          onClick={() => handleDelete(question.id)}
                          className="p-2 hover:bg-destructive/10 text-destructive rounded"
                          title="Remover pergunta"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="text-sm text-muted-foreground pt-2">
            {filteredQuestions.length} pergunta{filteredQuestions.length !== 1 ? 's' : ''}
            {regularCount > 0 && cultureCount > 0 && filterType === 'all' 
              ? ` (${regularCount} regulares + ${cultureCount} cultura)` 
              : ''}
            {filterDriver !== 'all' || filterActive !== 'all' || filterPillar !== 'all' || search ? ' (filtrado)' : ''}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog - only for regular questions */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? 'Editar Pergunta' : 'Nova Pergunta'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Driver</label>
              <Select
                value={formData.driver_id}
                onValueChange={value => setFormData(prev => ({ ...prev, driver_id: value, pillar_type: '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o driver" />
                </SelectTrigger>
                <SelectContent>
                  {activeDrivers.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pillar selector - only when culture driver is selected */}
            {isCultureDriver && (
              <div>
                <label className="text-sm font-medium mb-1 block">Pilar de Cultura</label>
                <Select
                  value={formData.pillar_type}
                  onValueChange={value => setFormData(prev => ({ ...prev, pillar_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o pilar" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PILLAR_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  A pergunta será associada a este pilar do Pulso de Cultura
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-1 block">Texto da Pergunta</label>
              <textarea
                value={formData.question_text}
                onChange={e => setFormData(prev => ({ ...prev, question_text: e.target.value }))}
                placeholder={isCultureDriver 
                  ? "O quanto você sente que este aspecto é praticado na empresa?" 
                  : "Como você está se sentindo hoje?"}
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {/* Regular question fields - hidden when culture driver */}
            {!isCultureDriver && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Tipo de Resposta</label>
                    <Select
                      value={formData.answer_type}
                      onValueChange={(value: AnswerType) => setFormData(prev => ({ ...prev, answer_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="emoji_scale">😊 Escala de Emojis</SelectItem>
                        <SelectItem value="multi_select">✅ Seleção Múltipla</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Repetição/Mês</label>
                    <Select
                      value={String(formData.max_repeat_per_month)}
                      onValueChange={value => setFormData(prev => ({ ...prev, max_repeat_per_month: Number(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4].map(n => (
                          <SelectItem key={n} value={String(n)}>Máx {n}x/mês</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.answer_type === 'emoji_scale' && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Conjunto de Resposta</label>
                    <Select
                      value={formData.emoji_set_id}
                      onValueChange={value => setFormData(prev => ({ ...prev, emoji_set_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o conjunto de emojis" />
                      </SelectTrigger>
                      <SelectContent>
                        {emojiSets.map(set => (
                          <SelectItem key={set.id} value={set.id}>
                            <span className="flex items-center gap-2">
                              {set.options?.map((opt, i) => (
                                <span key={i} className="text-sm">{opt.emoji}</span>
                              ))}
                              <span className="ml-1">{set.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Escala de emojis que será exibida para esta pergunta
                    </p>
                  </div>
                )}
              </>
            )}

            {isCultureDriver && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
                💡 Perguntas de cultura usam automaticamente a escala de emojis padrão (😡 a 😍).
              </p>
            )}

            <div className="flex items-center gap-2">
              <Switch
                id="anonymous"
                checked={formData.is_anonymous}
                onCheckedChange={checked => setFormData(prev => ({ ...prev, is_anonymous: checked }))}
              />
              <label htmlFor="anonymous" className="text-sm">
                Resposta anônima
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.question_text.trim() || !formData.driver_id || (isCultureDriver && !formData.pillar_type)}
            >
              {saving ? 'Salvando...' : editingQuestion ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}