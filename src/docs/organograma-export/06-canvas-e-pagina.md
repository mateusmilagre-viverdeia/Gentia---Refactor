# Fase 6: Canvas e Página Principal

## 📋 O que contém
- `OrgChartCanvas` - Área de desenho do organograma com zoom
- Página principal `Organograma.tsx`
- Instruções finais de instalação

---

## 1. OrgChartCanvas

**Arquivo: `src/components/organograma/OrgChartCanvas.tsx`**

```typescript
import { useState, useRef } from 'react';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { OrgChartNodeComponent } from './OrgChartNode';
import { NodeForm } from './NodeForm';
import { ZoomControls } from './ZoomControls';
import { useOrgChartZoom } from '@/hooks/useOrgChartZoom';
import type { OrgChartNode, OrgChartNodeWithChildren, NodePerson, VacancyStatus } from '@/types/org-chart.types';

interface OrgChartCanvasProps {
  tree: OrgChartNodeWithChildren[];
  onAddNode: (title: string, parentId: string | null, personName?: string, roles?: string[], personAvatar?: string, people?: NodePerson[], vacancyStatus?: VacancyStatus) => Promise<OrgChartNode | undefined>;
  onUpdateNode: (nodeId: string, updates: Partial<Pick<OrgChartNode, 'title' | 'person_name' | 'person_avatar' | 'roles' | 'notes' | 'tags' | 'people' | 'vacancy_status'>>) => void;
  onDeleteNode: (nodeId: string) => void;
}

export function OrgChartCanvas({
  tree,
  onAddNode,
  onUpdateNode,
  onDeleteNode,
}: OrgChartCanvasProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<OrgChartNodeWithChildren | null>(null);
  const [parentIdForNew, setParentIdForNew] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  const containerRef = useRef<HTMLDivElement>(null);
  const { zoomLevel, zoomIn, zoomOut, resetZoom, canZoomIn, canZoomOut } = useOrgChartZoom(containerRef);

  const handleAddRoot = () => {
    setEditingNode(null);
    setParentIdForNew(null);
    setFormMode('create');
    setIsFormOpen(true);
  };

  const handleAddChild = (parentId: string) => {
    setEditingNode(null);
    setParentIdForNew(parentId);
    setFormMode('create');
    setIsFormOpen(true);
  };

  const handleEdit = (node: OrgChartNodeWithChildren) => {
    setEditingNode(node);
    setFormMode('edit');
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (title: string, personName?: string, roles?: string[], personAvatar?: string, people?: NodePerson[], vacancyStatus?: VacancyStatus) => {
    await onAddNode(title, parentIdForNew, personName, roles, personAvatar, people, vacancyStatus);
    setIsFormOpen(false);
  };

  const handleFormUpdate = (updates: Partial<Pick<OrgChartNode, 'title' | 'person_name' | 'person_avatar' | 'roles' | 'people' | 'vacancy_status'>>) => {
    if (editingNode) {
      onUpdateNode(editingNode.id, updates);
      setIsFormOpen(false);
    }
  };

  if (tree.length === 0) {
    return (
      <>
        <Card className="max-w-md mx-auto text-center">
          <CardHeader>
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <CardTitle className="text-xl">Comece seu organograma</CardTitle>
            <CardDescription>
              Adicione o primeiro cargo (geralmente o CEO ou fundador)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleAddRoot}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Cargo Raiz
            </Button>
          </CardContent>
        </Card>

        <NodeForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSubmit={handleFormSubmit}
          mode="create"
        />
      </>
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <ZoomControls
          zoomLevel={zoomLevel}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onReset={resetZoom}
          canZoomIn={canZoomIn}
          canZoomOut={canZoomOut}
        />
      </div>

      <ScrollArea className="w-full h-[calc(100vh-320px)] border rounded-lg">
        <div 
          ref={containerRef}
          className="min-w-max p-8 flex flex-col items-center transition-transform duration-200 ease-out"
          style={{ 
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center',
          }}
        >
          {tree.map((rootNode) => (
            <OrgChartNodeComponent
              key={rootNode.id}
              node={rootNode}
              onEdit={handleEdit}
              onAddChild={handleAddChild}
              onDelete={onDeleteNode}
              onUpdateNotes={(nodeId, notes) => onUpdateNode(nodeId, { notes })}
              onUpdateTags={(nodeId, tags) => onUpdateNode(nodeId, { tags })}
              isRoot
            />
          ))}
          
          {/* Add another root level node button */}
          <div className="mt-8">
            <Button variant="outline" onClick={handleAddRoot}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Cargo Raiz
            </Button>
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
        <ScrollBar orientation="vertical" />
      </ScrollArea>

      <p className="text-xs text-muted-foreground text-center mt-2">
        Use Ctrl + scroll ou os controles acima para ajustar o zoom
      </p>

      <NodeForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        onUpdate={handleFormUpdate}
        editingNode={editingNode}
        mode={formMode}
      />
    </>
  );
}
```

---

## 2. Página Principal

**Arquivo: `src/pages/Organograma.tsx`**

> ⚠️ **ADAPTAR:** O layout e breadcrumb para o seu projeto

```typescript
import { useState } from 'react';
import { Settings, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  OrgChartSelector,
  OrgChartForm,
  OrgChartCanvas,
} from '@/components/organograma';
import { useOrgCharts } from '@/hooks/useOrgCharts';

export default function Organograma() {
  const {
    orgCharts,
    selectedChart,
    setSelectedChart,
    loading,
    createChart,
    updateChart,
    deleteChart,
    addNode,
    updateNode,
    deleteNode,
    getTreeStructure,
  } = useOrgCharts();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleCreateChart = async (name: string, description?: string) => {
    await createChart(name, description);
    setIsCreateOpen(false);
  };

  const handleUpdateChart = async (name: string, description?: string) => {
    if (selectedChart) {
      await updateChart(selectedChart.id, { name, description });
      setIsEditOpen(false);
    }
  };

  const handleDeleteChart = async () => {
    if (selectedChart) {
      await deleteChart(selectedChart.id);
      setIsDeleteOpen(false);
    }
  };

  const tree = getTreeStructure();

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with selector */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <OrgChartSelector
            charts={orgCharts}
            selectedChart={selectedChart}
            onSelect={setSelectedChart}
            onCreateNew={() => setIsCreateOpen(true)}
          />
          {selectedChart && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditOpen(true)}
                title="Editar organograma"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDeleteOpen(true)}
                title="Excluir organograma"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
        {selectedChart?.description && (
          <p className="text-sm text-muted-foreground">{selectedChart.description}</p>
        )}
      </div>

      {/* Main content */}
      {!selectedChart && orgCharts.length === 0 ? (
        <Card className="max-w-md mx-auto text-center">
          <CardHeader>
            <CardTitle className="text-xl">Crie seu primeiro organograma</CardTitle>
            <CardDescription>
              Visualize a estrutura hierárquica da sua empresa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setIsCreateOpen(true)}>
              Criar Organograma
            </Button>
          </CardContent>
        </Card>
      ) : selectedChart ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Estrutura Organizacional</CardTitle>
            <CardDescription>
              Clique em um cargo para editar, use o botão + para adicionar subordinados
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-[500px]">
            <OrgChartCanvas
              tree={tree}
              onAddNode={addNode}
              onUpdateNode={updateNode}
              onDeleteNode={deleteNode}
            />
          </CardContent>
        </Card>
      ) : null}

      {/* Create Chart Dialog */}
      <OrgChartForm
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreateChart}
      />

      {/* Edit Chart Dialog */}
      <OrgChartForm
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSubmit={() => {}}
        onUpdate={handleUpdateChart}
        editingChart={selectedChart}
      />

      {/* Delete Chart Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir organograma "{selectedChart?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O organograma e todos os cargos serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChart}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

---

## 📦 Todas as Dependências NPM

```bash
npm install sonner lucide-react @supabase/supabase-js
```

---

## 📦 Todos os Componentes Shadcn

```bash
npx shadcn@latest add button card dialog input label textarea select tooltip avatar badge radio-group dropdown-menu alert-dialog sheet scroll-area skeleton
```

---

## ✅ Checklist Final

### Database
- [ ] Executar SQL das tabelas `org_charts` e `org_chart_nodes`
- [ ] Configurar RLS policies
- [ ] Criar bucket `avatars` no Storage

### Tipos
- [ ] `src/types/org-chart.types.ts`

### Hooks
- [ ] `src/hooks/use-debounce.ts`
- [ ] `src/hooks/useOrgChartZoom.ts`
- [ ] `src/hooks/useOrgCharts.ts` (adaptar `useAccount`)

### Componentes
- [ ] `src/components/organograma/ZoomControls.tsx`
- [ ] `src/components/organograma/OrgChartSelector.tsx`
- [ ] `src/components/organograma/OrgChartForm.tsx`
- [ ] `src/components/organograma/NodeForm.tsx`
- [ ] `src/components/organograma/OrgChartNode.tsx`
- [ ] `src/components/organograma/NotesPanel.tsx`
- [ ] `src/components/organograma/TagsPanel.tsx`
- [ ] `src/components/organograma/OrgChartCanvas.tsx`
- [ ] `src/components/organograma/index.ts`

### Página
- [ ] `src/pages/Organograma.tsx`
- [ ] Adicionar rota no router
- [ ] Adaptar layout para seu projeto

---

## 🎉 Funcionalidades Incluídas

| Feature | Descrição |
|---------|-----------|
| ✅ Múltiplos organogramas | Criar e alternar entre vários |
| ✅ Hierarquia ilimitada | Qualquer profundidade |
| ✅ Múltiplas pessoas | Até 20 por cargo |
| ✅ Status de vaga | Ativa / Faltando (destaque vermelho) |
| ✅ Tags coloridas | 8 cores disponíveis |
| ✅ Anotações | Salvamento automático |
| ✅ Upload de fotos | Avatar por pessoa |
| ✅ Zoom | Ctrl+scroll, botões, atalhos |
| ✅ Responsabilidades | Lista por cargo |
| ✅ Design responsivo | Funciona em desktop |

---

## 🎊 Parabéns!

Você completou todas as 6 fases. O organograma está pronto para uso!
