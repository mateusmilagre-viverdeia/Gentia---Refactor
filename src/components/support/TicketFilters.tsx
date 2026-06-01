import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { TicketFilters as TicketFiltersType } from '@/types/support.types';
import { statusLabels, priorityLabels, categoryLabels } from '@/types/support.types';

interface TicketFiltersProps {
  filters: TicketFiltersType;
  onFiltersChange: (filters: TicketFiltersType) => void;
}

export function TicketFilters({ filters, onFiltersChange }: TicketFiltersProps) {
  const hasActiveFilters = 
    (filters.status && filters.status !== 'all') ||
    (filters.priority && filters.priority !== 'all') ||
    (filters.category && filters.category !== 'all') ||
    (filters.assigned_to && filters.assigned_to !== 'all');

  const clearFilters = () => {
    onFiltersChange({
      status: 'all',
      priority: 'all',
      category: 'all',
      assigned_to: 'all',
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={filters.status || 'all'}
        onValueChange={(value) => onFiltersChange({ ...filters, status: value as TicketFiltersType['status'] })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos Status</SelectItem>
          {Object.entries(statusLabels).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.priority || 'all'}
        onValueChange={(value) => onFiltersChange({ ...filters, priority: value as TicketFiltersType['priority'] })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Prioridade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas Prioridades</SelectItem>
          {Object.entries(priorityLabels).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.category || 'all'}
        onValueChange={(value) => onFiltersChange({ ...filters, category: value as TicketFiltersType['category'] })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas Categorias</SelectItem>
          {Object.entries(categoryLabels).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.assigned_to || 'all'}
        onValueChange={(value) => onFiltersChange({ ...filters, assigned_to: value })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="unassigned">Sem Responsável</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-muted-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  );
}
