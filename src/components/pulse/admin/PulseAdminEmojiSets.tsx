import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, RefreshCw, Copy } from 'lucide-react';
import type { PulseEmojiSet, EmojiOption } from '@/types/pulse.types';

interface Props {
  emojiSets: PulseEmojiSet[];
  loading: boolean;
  onCreate: (data: Partial<PulseEmojiSet>) => Promise<any>;
  onUpdate: (id: string, updates: Partial<PulseEmojiSet>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => void;
}

interface FormData {
  name: string;
  type: PulseEmojiSet['type'];
  options: EmojiOption[];
}

const defaultOptions: EmojiOption[] = [
  { value: 0, emoji: '😞', label: 'Muito Baixo' },
  { value: 3, emoji: '😕', label: 'Baixo' },
  { value: 5, emoji: '😐', label: 'Neutro' },
  { value: 7, emoji: '🙂', label: 'Bom' },
  { value: 10, emoji: '😄', label: 'Excelente' },
];

const typeLabels: Record<PulseEmojiSet['type'], string> = {
  likert5: 'Satisfação (Likert)',
  energy5: 'Energia',
  clarity5: 'Clareza',
  pride5: 'Orgulho',
  culture5: 'Cultura',
};

export function PulseAdminEmojiSets({
  emojiSets,
  loading,
  onCreate,
  onUpdate,
  onDelete,
  onRefresh,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<PulseEmojiSet | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: 'likert5',
    options: [...defaultOptions],
  });
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditingSet(null);
    setFormData({
      name: '',
      type: 'likert5',
      options: [...defaultOptions],
    });
    setDialogOpen(true);
  };

  const openEdit = (set: PulseEmojiSet) => {
    setEditingSet(set);
    setFormData({
      name: set.name,
      type: set.type,
      options: set.options || [...defaultOptions],
    });
    setDialogOpen(true);
  };

  const handleDuplicate = (set: PulseEmojiSet) => {
    setEditingSet(null);
    setFormData({
      name: `${set.name} (cópia)`,
      type: set.type,
      options: set.options || [...defaultOptions],
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      if (editingSet) {
        await onUpdate(editingSet.id, {
          name: formData.name,
          type: formData.type,
          options: formData.options,
        });
      } else {
        await onCreate({
          name: formData.name,
          type: formData.type,
          options: formData.options,
          is_default: false,
        });
      }
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este conjunto de resposta?')) {
      await onDelete(id);
    }
  };

  const updateOption = (index: number, field: keyof EmojiOption, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => 
        i === index ? { ...opt, [field]: value } : opt
      ),
    }));
  };

  const renderPreview = (options: EmojiOption[]) => {
    return (
      <div className="flex items-center gap-1">
        {options.map((opt, i) => (
          <span key={i} className="text-lg" title={opt.label}>{opt.emoji}</span>
        ))}
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Conjuntos de Resposta</CardTitle>
            <CardDescription>
              Gerencie as escalas de emojis disponíveis para as perguntas
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={openCreate} size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Novo Conjunto
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && emojiSets.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : emojiSets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum conjunto de resposta encontrado.</p>
              <p className="text-sm mt-1">Crie um novo conjunto para usar nas perguntas.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {emojiSets.map(set => {
                const isSystemSet = set.account_id === null;
                return (
                  <div
                    key={set.id}
                    className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{set.name}</span>
                        {isSystemSet ? (
                          <Badge variant="default" className="bg-blue-500/10 text-blue-600 border-blue-200">
                            Sistema
                          </Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-200">
                            Customizado
                          </Badge>
                        )}
                        {set.is_default && (
                          <Badge variant="secondary">Padrão</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {renderPreview(set.options || [])}
                        <span className="text-xs text-muted-foreground">
                          {typeLabels[set.type] || set.type}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleDuplicate(set)}
                        className="p-2 hover:bg-accent rounded"
                        title="Duplicar conjunto"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      {!isSystemSet && (
                        <>
                          <button
                            onClick={() => openEdit(set)}
                            className="p-2 hover:bg-accent rounded"
                            title="Editar conjunto"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(set.id)}
                            className="p-2 hover:bg-destructive/10 text-destructive rounded"
                            title="Remover conjunto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="text-sm text-muted-foreground pt-2">
            {emojiSets.length} conjunto{emojiSets.length !== 1 ? 's' : ''} de resposta
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSet ? 'Editar Conjunto' : 'Novo Conjunto de Resposta'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Nome do Conjunto</label>
              <Input
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Satisfação Geral"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Tipo</label>
              <select
                value={formData.type}
                onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as PulseEmojiSet['type'] }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Opções de Resposta (5 níveis)</label>
              <div className="space-y-2">
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 rounded border bg-muted/30">
                    <span className="text-xs text-muted-foreground w-4">{index + 1}</span>
                    <Input
                      value={option.emoji}
                      onChange={e => updateOption(index, 'emoji', e.target.value)}
                      placeholder="😊"
                      className="w-16 text-center text-lg"
                    />
                    <Input
                      value={option.label}
                      onChange={e => updateOption(index, 'label', e.target.value)}
                      placeholder="Label"
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={option.value}
                      onChange={e => updateOption(index, 'value', Number(e.target.value))}
                      className="w-16 text-center"
                      title="Valor numérico (0-10)"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Emoji, label descritivo e valor numérico (0-10) para cada nível
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Preview</label>
              <div className="p-4 rounded-lg border bg-muted/30 flex items-center justify-center gap-4">
                {formData.options.map((opt, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="text-xs text-muted-foreground">{opt.label}</span>
                    <span className="text-xs text-muted-foreground">({opt.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.name.trim()}
            >
              {saving ? 'Salvando...' : editingSet ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
