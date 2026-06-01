import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { PlaybookGuide, PlaybookPhaseWithMilestones, CreateGuideInput } from '@/types/playbook.types';
import ReactMarkdown from 'react-markdown';
import { Plus, Edit, Trash2, FileText, Eye, Code, BookOpen, Loader2, GripVertical } from 'lucide-react';

interface PlaybookGuideEditorProps {
  playbookId: string;
  guides: PlaybookGuide[];
  phases: PlaybookPhaseWithMilestones[];
  onCreateGuide: (input: CreateGuideInput) => Promise<PlaybookGuide | null>;
  onUpdateGuide: (id: string, updates: Partial<PlaybookGuide>) => Promise<boolean>;
  onDeleteGuide: (id: string) => Promise<boolean>;
}

interface GuideFormData {
  title: string;
  content: string;
  phase_id: string | null;
  milestone_id: string | null;
}

export function PlaybookGuideEditor({
  playbookId,
  guides,
  phases,
  onCreateGuide,
  onUpdateGuide,
  onDeleteGuide,
}: PlaybookGuideEditorProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingGuide, setEditingGuide] = useState<PlaybookGuide | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<GuideFormData>({
    title: '',
    content: '',
    phase_id: null,
    milestone_id: null,
  });
  const [previewTab, setPreviewTab] = useState<'edit' | 'preview'>('edit');

  // Get all milestones from all phases for selection
  const allMilestones = phases.flatMap(phase => 
    phase.milestones.map(m => ({
      ...m,
      phaseName: phase.name,
    }))
  );

  const openCreateDialog = () => {
    setFormData({
      title: '',
      content: '',
      phase_id: null,
      milestone_id: null,
    });
    setPreviewTab('edit');
    setShowCreateDialog(true);
  };

  const openEditDialog = (guide: PlaybookGuide) => {
    setFormData({
      title: guide.title,
      content: guide.content,
      phase_id: guide.phase_id,
      milestone_id: guide.milestone_id,
    });
    setPreviewTab('edit');
    setEditingGuide(guide);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content.trim()) return;
    
    setLoading(true);
    try {
      if (editingGuide) {
        await onUpdateGuide(editingGuide.id, {
          title: formData.title.trim(),
          content: formData.content.trim(),
          phase_id: formData.phase_id,
          milestone_id: formData.milestone_id,
        });
        setEditingGuide(null);
      } else {
        await onCreateGuide({
          playbook_id: playbookId,
          title: formData.title.trim(),
          content: formData.content.trim(),
          phase_id: formData.phase_id || undefined,
          milestone_id: formData.milestone_id || undefined,
          order_index: guides.length,
        });
        setShowCreateDialog(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (guideId: string) => {
    setLoading(true);
    try {
      await onDeleteGuide(guideId);
    } finally {
      setLoading(false);
    }
  };

  const getAssociationLabel = (guide: PlaybookGuide) => {
    if (guide.milestone_id) {
      const milestone = allMilestones.find(m => m.id === guide.milestone_id);
      return milestone ? `Marco: ${milestone.milestone_name}` : 'Marco não encontrado';
    }
    if (guide.phase_id) {
      const phase = phases.find(p => p.id === guide.phase_id);
      return phase ? `Fase: ${phase.name}` : 'Fase não encontrada';
    }
    return 'Geral';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Guias de Execução
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Documentação e instruções para execução do playbook
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Guia
        </Button>
      </div>

      {guides.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhum guia cadastrado.<br />
              Adicione instruções para facilitar a execução do playbook.
            </p>
            <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Guia
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {guides.map(guide => (
            <Card key={guide.id}>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <div>
                      <CardTitle className="text-base">{guide.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {getAssociationLabel(guide)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditDialog(guide)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(guide.id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="prose prose-sm dark:prose-invert max-w-none line-clamp-3">
                  <ReactMarkdown>{guide.content}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog 
        open={showCreateDialog || !!editingGuide} 
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingGuide(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGuide ? 'Editar Guia' : 'Novo Guia'}</DialogTitle>
            <DialogDescription>
              {editingGuide 
                ? 'Atualize o conteúdo do guia de execução.'
                : 'Crie um guia com instruções para execução.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Como conduzir a reunião de kickoff"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Associar à Fase (opcional)</Label>
                <Select
                  value={formData.phase_id || 'none'}
                  onValueChange={(v) => setFormData(prev => ({ 
                    ...prev, 
                    phase_id: v === 'none' ? null : v,
                    milestone_id: null, // Clear milestone when changing phase
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma (Geral)</SelectItem>
                    {phases.map(phase => (
                      <SelectItem key={phase.id} value={phase.id}>
                        {phase.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Associar ao Marco (opcional)</Label>
                <Select
                  value={formData.milestone_id || 'none'}
                  onValueChange={(v) => setFormData(prev => ({ 
                    ...prev, 
                    milestone_id: v === 'none' ? null : v,
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {allMilestones.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.phaseName} → {m.milestone_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Conteúdo *</Label>
                <Tabs value={previewTab} onValueChange={(v) => setPreviewTab(v as 'edit' | 'preview')}>
                  <TabsList className="h-8">
                    <TabsTrigger value="edit" className="text-xs px-3 h-7">
                      <Code className="h-3 w-3 mr-1" />
                      Editar
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="text-xs px-3 h-7">
                      <Eye className="h-3 w-3 mr-1" />
                      Preview
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {previewTab === 'edit' ? (
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Escreva o conteúdo do guia usando Markdown..."
                  rows={12}
                  className="font-mono text-sm"
                />
              ) : (
                <div className="min-h-[280px] border rounded-md p-4 prose prose-sm dark:prose-invert max-w-none overflow-y-auto">
                  {formData.content ? (
                    <ReactMarkdown>{formData.content}</ReactMarkdown>
                  ) : (
                    <p className="text-muted-foreground italic">Nenhum conteúdo para visualizar</p>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Suporta Markdown: **negrito**, *itálico*, # títulos, - listas, etc.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setShowCreateDialog(false);
                setEditingGuide(null);
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !formData.title.trim() || !formData.content.trim()}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingGuide ? 'Salvar' : 'Criar Guia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
