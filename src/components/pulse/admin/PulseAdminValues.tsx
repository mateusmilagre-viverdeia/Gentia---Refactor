import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, RefreshCw, Download, CheckCircle2, XCircle } from 'lucide-react';
import type { PulseCompanyValue } from '@/types/pulse.types';

interface Props {
  values: PulseCompanyValue[];
  loading: boolean;
  onCreate: (value: Partial<PulseCompanyValue>) => Promise<any>;
  onUpdate: (id: string, updates: Partial<PulseCompanyValue>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => void;
  onImportFromCulture?: () => Promise<{ success: boolean; imported: number; skipped: number }>;
}

export function PulseAdminValues({ values, loading, onCreate, onUpdate, onDelete, onRefresh, onImportFromCulture }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingValue, setEditingValue] = useState<PulseCompanyValue | null>(null);
  const [formData, setFormData] = useState({ name: '', emoji: '⭐', description: '' });
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const openCreate = () => {
    setEditingValue(null);
    setFormData({ name: '', emoji: '⭐', description: '' });
    setDialogOpen(true);
  };

  const openEdit = (value: PulseCompanyValue) => {
    setEditingValue(value);
    setFormData({
      name: value.name,
      emoji: value.emoji || '⭐',
      description: value.description || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      if (editingValue) {
        await onUpdate(editingValue.id, formData);
      } else {
        await onCreate(formData);
      }
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este valor?')) {
      await onDelete(id);
    }
  };

  const handleImport = async () => {
    if (!onImportFromCulture) return;
    setImporting(true);
    try {
      await onImportFromCulture();
    } finally {
      setImporting(false);
    }
  };

  if (loading && values.length === 0) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Valores da Empresa</CardTitle>
            <CardDescription>
              Defina os valores organizacionais para perguntas de cultura
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {onImportFromCulture && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleImport}
                disabled={importing}
                className="gap-1"
              >
                <Download className="h-4 w-4" />
                {importing ? 'Importando...' : 'Importar da Cultura'}
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={openCreate} size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {values.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum valor cadastrado ainda.</p>
              <p className="text-sm mb-4">Importe os valores já definidos na Criação de Cultura ou adicione manualmente.</p>
              {onImportFromCulture && (
                <Button onClick={handleImport} disabled={importing} className="gap-2">
                  <Download className="h-4 w-4" />
                  {importing ? 'Importando...' : 'Importar da Criação de Cultura'}
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {values.map(value => (
                <div
                  key={value.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                >
                  <span className="text-2xl">{value.emoji || '⭐'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{value.name}</div>
                    {value.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {value.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      {(value.dos?.length ?? 0) > 0 && (
                        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3" />
                          {value.dos.length} DOs
                        </span>
                      )}
                      {(value.donts?.length ?? 0) > 0 && (
                        <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                          <XCircle className="h-3 w-3" />
                          {value.donts.length} DON'Ts
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={value.is_active}
                      onCheckedChange={(checked) => onUpdate(value.id, { is_active: checked })}
                    />
                    <button
                      onClick={() => openEdit(value)}
                      className="p-1.5 hover:bg-accent rounded"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(value.id)}
                      className="p-1.5 hover:bg-destructive/10 text-destructive rounded"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingValue ? 'Editar Valor' : 'Novo Valor da Empresa'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-3">
              <div className="w-20">
                <label className="text-sm font-medium mb-1 block">Emoji</label>
                <Input
                  value={formData.emoji}
                  onChange={e => setFormData(prev => ({ ...prev, emoji: e.target.value }))}
                  className="text-center text-xl"
                  maxLength={2}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Nome do Valor</label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Inovação"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Descrição (opcional)</label>
              <Input
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Breve descrição do valor"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.name.trim()}>
              {saving ? 'Salvando...' : editingValue ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
