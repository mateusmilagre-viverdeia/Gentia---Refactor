# Fase 3: Componentes Base

## 📋 O que contém
- `ZoomControls` - Controles de zoom
- `OrgChartSelector` - Seletor de organogramas
- `OrgChartForm` - Formulário criar/editar organograma

---

## 1. ZoomControls

**Arquivo: `src/components/organograma/ZoomControls.tsx`**

```typescript
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ZoomControlsProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
}

export function ZoomControls({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onReset,
  canZoomIn,
  canZoomOut,
}: ZoomControlsProps) {
  const zoomPercentage = Math.round(zoomLevel * 100);

  return (
    <div className="flex items-center gap-1 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg p-1 shadow-sm">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onZoomOut}
            disabled={!canZoomOut}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Diminuir (Ctrl + -)</p>
        </TooltipContent>
      </Tooltip>

      <div className="min-w-[60px] text-center text-sm font-medium tabular-nums">
        {zoomPercentage}%
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onZoomIn}
            disabled={!canZoomIn}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Aumentar (Ctrl + +)</p>
        </TooltipContent>
      </Tooltip>

      <div className="w-px h-6 bg-border mx-1" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onReset}
            disabled={zoomLevel === 1}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Resetar (Ctrl + 0)</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
```

---

## 2. OrgChartSelector

**Arquivo: `src/components/organograma/OrgChartSelector.tsx`**

```typescript
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { OrgChart } from '@/types/org-chart.types';

interface OrgChartSelectorProps {
  charts: OrgChart[];
  selectedChart: OrgChart | null;
  onSelect: (chart: OrgChart) => void;
  onCreateNew: () => void;
}

export function OrgChartSelector({
  charts,
  selectedChart,
  onSelect,
  onCreateNew,
}: OrgChartSelectorProps) {
  const handleChange = (chartId: string) => {
    const chart = charts.find(c => c.id === chartId);
    if (chart) onSelect(chart);
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedChart?.id || ''} onValueChange={handleChange}>
        <SelectTrigger className="w-[250px]">
          <SelectValue placeholder="Selecione um organograma" />
        </SelectTrigger>
        <SelectContent>
          {charts.map(chart => (
            <SelectItem key={chart.id} value={chart.id}>
              {chart.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" size="icon" onClick={onCreateNew} title="Novo organograma">
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

---

## 3. OrgChartForm

**Arquivo: `src/components/organograma/OrgChartForm.tsx`**

```typescript
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { OrgChart } from '@/types/org-chart.types';

interface OrgChartFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, description?: string) => void;
  onUpdate?: (name: string, description?: string) => void;
  editingChart?: OrgChart | null;
}

export function OrgChartForm({
  open,
  onOpenChange,
  onSubmit,
  onUpdate,
  editingChart,
}: OrgChartFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (editingChart) {
      setName(editingChart.name);
      setDescription(editingChart.description || '');
    } else {
      setName('');
      setDescription('');
    }
  }, [editingChart, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingChart && onUpdate) {
      onUpdate(name, description || undefined);
    } else {
      onSubmit(name, description || undefined);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingChart ? 'Editar Organograma' : 'Novo Organograma'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Organograma Geral"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descreva o propósito deste organograma"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingChart ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 4. Index (Barrel Export)

**Arquivo: `src/components/organograma/index.ts`**

```typescript
export { OrgChartSelector } from './OrgChartSelector';
export { OrgChartForm } from './OrgChartForm';
export { OrgChartCanvas } from './OrgChartCanvas';
export { OrgChartNodeComponent } from './OrgChartNode';
export { NodeForm } from './NodeForm';
export { NotesPanel } from './NotesPanel';
```

---

## ✅ Checklist da Fase 3

- [ ] Criar pasta `src/components/organograma/`
- [ ] Criar `ZoomControls.tsx`
- [ ] Criar `OrgChartSelector.tsx`
- [ ] Criar `OrgChartForm.tsx`
- [ ] Criar `index.ts` (barrel export)

---

## 📦 Componentes Shadcn Necessários

```bash
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add textarea
npx shadcn@latest add select
npx shadcn@latest add tooltip
```

---

## 🔜 Próxima Fase
Fase 4: Componentes Node (`04-componentes-node.md`)
