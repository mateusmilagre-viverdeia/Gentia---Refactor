import { X, Filter, Users, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FilterOption } from "@/types/people-analysis.types";

interface PeopleAnalysisFiltersProps {
  teams: FilterOption[];
  functions: FilterOption[];
  selectedTeamId: string | null;
  selectedFunctionId: string | null;
  onTeamChange: (id: string | null) => void;
  onFunctionChange: (id: string | null) => void;
  isLoading?: boolean;
}

export function PeopleAnalysisFilters({
  teams,
  functions,
  selectedTeamId,
  selectedFunctionId,
  onTeamChange,
  onFunctionChange,
  isLoading = false,
}: PeopleAnalysisFiltersProps) {
  const selectedTeam = teams.find(t => t.id === selectedTeamId);
  const selectedFunction = functions.find(f => f.id === selectedFunctionId);
  
  const hasActiveFilters = selectedTeamId || selectedFunctionId;

  const clearAllFilters = () => {
    onTeamChange(null);
    onFunctionChange(null);
  };

  return (
    <div className="space-y-3">
      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Filtros:</span>
        </div>

        {/* Team Filter */}
        <Select
          value={selectedTeamId || "all"}
          onValueChange={(value) => onTeamChange(value === "all" ? null : value)}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[200px] bg-background">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Todos os Times" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-background border shadow-lg z-50">
            <SelectItem value="all">Todos os Times</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name} ({team.memberCount})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Function Filter */}
        <Select
          value={selectedFunctionId || "all"}
          onValueChange={(value) => onFunctionChange(value === "all" ? null : value)}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[200px] bg-background">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Todas as Funções" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-background border shadow-lg z-50">
            <SelectItem value="all">Todas as Funções</SelectItem>
            {functions.map((func) => (
              <SelectItem key={func.id} value={func.id}>
                {func.name} ({func.memberCount})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            Limpar Filtros
          </Button>
        )}
      </div>

      {/* Active Filters Badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Filtros ativos:</span>
          
          {selectedTeam && (
            <Badge variant="secondary" className="gap-1 pr-1">
              <Users className="h-3 w-3" />
              {selectedTeam.name}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => onTeamChange(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {selectedFunction && (
            <Badge variant="secondary" className="gap-1 pr-1">
              <Briefcase className="h-3 w-3" />
              {selectedFunction.name}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => onFunctionChange(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
