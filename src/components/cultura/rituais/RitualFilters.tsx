import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X, Clock, Zap, Users } from "lucide-react";

export type RitualDurationFilter = 'all' | 'rapido' | 'medio' | 'longo';
export type RitualComplexityFilter = 'all' | 'facil' | 'complexo';
export type RitualFormatFilter = 'all' | 'sincrono' | 'assincrono';

export interface RitualFiltersState {
  duration: RitualDurationFilter;
  complexity: RitualComplexityFilter;
  format: RitualFormatFilter;
}

interface RitualFiltersProps {
  filters: RitualFiltersState;
  onFiltersChange: (filters: RitualFiltersState) => void;
  totalCount: number;
  filteredCount: number;
}

export function RitualFilters({ filters, onFiltersChange, totalCount, filteredCount }: RitualFiltersProps) {
  const hasActiveFilters = filters.duration !== 'all' || filters.complexity !== 'all' || filters.format !== 'all';

  const clearFilters = () => {
    onFiltersChange({ duration: 'all', complexity: 'all', format: 'all' });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Filtrar:</span>
        
        <Select
          value={filters.duration}
          onValueChange={(value) => onFiltersChange({ ...filters, duration: value as RitualDurationFilter })}
        >
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <Clock className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Duração" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas durações</SelectItem>
            <SelectItem value="rapido">⏱ Rápido (até 5min)</SelectItem>
            <SelectItem value="medio">⏱ Médio (5-15min)</SelectItem>
            <SelectItem value="longo">⏱ Longo (15min+)</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.complexity}
          onValueChange={(value) => onFiltersChange({ ...filters, complexity: value as RitualComplexityFilter })}
        >
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <Zap className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Complexidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas complexidades</SelectItem>
            <SelectItem value="facil">✓ Fácil</SelectItem>
            <SelectItem value="complexo">⚡ Mais Complexo</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.format}
          onValueChange={(value) => onFiltersChange({ ...filters, format: value as RitualFormatFilter })}
        >
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <Users className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Formato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos formatos</SelectItem>
            <SelectItem value="sincrono">👥 Síncrono</SelectItem>
            <SelectItem value="assincrono">📱 Assíncrono</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs">
            <X className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        )}
      </div>
      
      {hasActiveFilters && (
        <p className="text-xs text-muted-foreground">
          Mostrando {filteredCount} de {totalCount} sugestões
        </p>
      )}
    </div>
  );
}
