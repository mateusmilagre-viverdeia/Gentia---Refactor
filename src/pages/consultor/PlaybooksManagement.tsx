import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PlaybookCard } from '@/components/playbooks/PlaybookCard';
import { PlaybookFormDialog } from '@/components/playbooks/PlaybookFormDialog';
import { PlaybookEditor } from '@/components/playbooks/PlaybookEditor';
import { usePlaybooks } from '@/hooks/usePlaybooks';
import { ProjectPlaybook, PlaybookCategory, PLAYBOOK_CATEGORY_CONFIG } from '@/types/playbook.types';
import { Plus, Search, BookOpen, RefreshCw, Layers, Clock, CheckCircle, Edit } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function PlaybooksManagement() {
  const { playbooks, loading, createPlaybook, updatePlaybook, deletePlaybook, duplicatePlaybook, refreshPlaybooks } = usePlaybooks();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<PlaybookCategory | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPlaybookMetadata, setEditingPlaybookMetadata] = useState<ProjectPlaybook | null>(null);
  const [editingPlaybookId, setEditingPlaybookId] = useState<string | null>(null);
  const [deletingPlaybook, setDeletingPlaybook] = useState<ProjectPlaybook | null>(null);

  // Filter playbooks
  const filteredPlaybooks = playbooks.filter(pb => {
    if (searchQuery && !pb.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterCategory !== 'all' && pb.category !== filterCategory) return false;
    if (filterStatus === 'active' && !pb.is_active) return false;
    if (filterStatus === 'inactive' && pb.is_active) return false;
    return true;
  });

  // Stats
  const totalPlaybooks = playbooks.length;
  const activePlaybooks = playbooks.filter(pb => pb.is_active).length;
  const defaultPlaybooks = playbooks.filter(pb => pb.is_default).length;

  const handleEdit = (playbook: ProjectPlaybook) => {
    setEditingPlaybookId(playbook.id);
  };

  const handleEditMetadata = (playbook: ProjectPlaybook) => {
    setEditingPlaybookMetadata(playbook);
  };

  const handleDuplicate = async (playbook: ProjectPlaybook) => {
    const newName = `${playbook.name} (Cópia)`;
    const newPlaybook = await duplicatePlaybook(playbook.id, newName);
    if (newPlaybook) {
      toast({
        title: 'Playbook duplicado',
        description: `Uma cópia de "${playbook.name}" foi criada.`,
      });
    }
  };

  const handleToggleActive = async (playbook: ProjectPlaybook) => {
    const success = await updatePlaybook(playbook.id, { is_active: !playbook.is_active });
    if (success) {
      toast({
        title: playbook.is_active ? 'Playbook desativado' : 'Playbook ativado',
        description: `O playbook "${playbook.name}" foi ${playbook.is_active ? 'desativado' : 'ativado'}.`,
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingPlaybook) return;
    
    const success = await deletePlaybook(deletingPlaybook.id);
    if (success) {
      toast({
        title: 'Playbook excluído',
        description: `O playbook "${deletingPlaybook.name}" foi removido.`,
      });
    }
    setDeletingPlaybook(null);
  };

  const handleCreate = async (data: Parameters<typeof createPlaybook>[0]) => {
    const success = await createPlaybook(data);
    if (success) {
      toast({
        title: 'Playbook criado',
        description: 'O novo playbook foi criado com sucesso.',
      });
      setShowCreateDialog(false);
    }
  };

  const handleUpdate = async (data: Parameters<typeof updatePlaybook>[1]) => {
    if (!editingPlaybookMetadata) return;
    
    const success = await updatePlaybook(editingPlaybookMetadata.id, data);
    if (success) {
      toast({
        title: 'Playbook atualizado',
        description: 'As alterações foram salvas.',
      });
      setEditingPlaybookMetadata(null);
    }
  };

  // Show PlaybookEditor when editing
  if (editingPlaybookId) {
    return (
      <PlaybookEditor 
        playbookId={editingPlaybookId} 
        onClose={() => {
          setEditingPlaybookId(null);
          refreshPlaybooks();
        }} 
      />
    );
  }

  return (
    <AppLayout title="Playbooks de Projeto">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              Playbooks de Projeto
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie templates de execução para projetos de consultoria
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={refreshPlaybooks} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Playbook
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPlaybooks}</p>
                <p className="text-sm text-muted-foreground">Total de Playbooks</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-3 rounded-full bg-emerald-500/10">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activePlaybooks}</p>
                <p className="text-sm text-muted-foreground">Playbooks Ativos</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-3 rounded-full bg-orange-500/10">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{defaultPlaybooks}</p>
                <p className="text-sm text-muted-foreground">Templates Padrão</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar playbooks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v as PlaybookCategory | 'all')}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Categorias</SelectItem>
              {Object.entries(PLAYBOOK_CATEGORY_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as 'all' | 'active' | 'inactive')}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Playbooks Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-6 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredPlaybooks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <CardTitle className="text-lg mb-2">Nenhum playbook encontrado</CardTitle>
              <CardDescription className="text-center max-w-md">
                {searchQuery || filterCategory !== 'all' || filterStatus !== 'all' 
                  ? 'Tente ajustar os filtros de busca.'
                  : 'Crie seu primeiro playbook para começar a padronizar os projetos.'}
              </CardDescription>
              {!searchQuery && filterCategory === 'all' && filterStatus === 'all' && (
                <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Playbook
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlaybooks.map(playbook => (
              <PlaybookCard
                key={playbook.id}
                playbook={playbook}
                onEdit={handleEdit}
                onEditMetadata={handleEditMetadata}
                onDuplicate={handleDuplicate}
                onToggleActive={handleToggleActive}
                onDelete={setDeletingPlaybook}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <PlaybookFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreate}
      />

      {/* Edit Metadata Dialog */}
      <PlaybookFormDialog
        open={!!editingPlaybookMetadata}
        onOpenChange={(open) => !open && setEditingPlaybookMetadata(null)}
        playbook={editingPlaybookMetadata || undefined}
        onSubmit={handleUpdate}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingPlaybook} onOpenChange={(open) => !open && setDeletingPlaybook(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir playbook?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O playbook "{deletingPlaybook?.name}" será permanentemente excluído.
              Projetos que já usaram este playbook não serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
