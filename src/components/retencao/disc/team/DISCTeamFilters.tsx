import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, User, Filter } from "lucide-react";

interface TeamOption {
  id: string;
  name: string;
  memberCount: number;
  leaderId?: string | null;
  leaderName?: string | null;
}

interface LeaderOption {
  id: string;
  name: string;
  teamCount: number;
}

interface DISCTeamFiltersProps {
  teams: TeamOption[];
  leaders: LeaderOption[];
  selectedTeamId: string | null;
  selectedLeaderId: string | null;
  onTeamChange: (teamId: string | null) => void;
  onLeaderChange: (leaderId: string | null) => void;
  isLoading?: boolean;
}

export function DISCTeamFilters({
  teams,
  leaders,
  selectedTeamId,
  selectedLeaderId,
  onTeamChange,
  onLeaderChange,
  isLoading = false
}: DISCTeamFiltersProps) {
  // Filter teams by selected leader
  const filteredTeams = selectedLeaderId
    ? teams.filter(team => team.leaderId === selectedLeaderId)
    : teams;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
      {/* Leader Filter */}
      {leaders.length > 0 && (
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
          <Select
            value={selectedLeaderId || 'all'}
            onValueChange={(value) => {
              onLeaderChange(value === 'all' ? null : value);
              // Reset team selection when leader changes
              if (value !== 'all' && selectedTeamId) {
                const teamBelongsToLeader = teams.find(
                  t => t.id === selectedTeamId && t.leaderId === value
                );
                if (!teamBelongsToLeader) {
                  onTeamChange(null);
                }
              }
            }}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrar por líder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Todos os Líderes
                </div>
              </SelectItem>
              {leaders.map((leader) => (
                <SelectItem key={leader.id} value={leader.id}>
                  <div className="flex items-center justify-between gap-2">
                    <span>{leader.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {leader.teamCount} {leader.teamCount === 1 ? 'time' : 'times'}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Team Filter */}
      <Select
        value={selectedTeamId || 'all'}
        onValueChange={(value) => onTeamChange(value === 'all' ? null : value)}
        disabled={isLoading}
      >
        <SelectTrigger className="w-full sm:w-[220px]">
          <SelectValue placeholder="Selecione um time" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {selectedLeaderId ? 'Todos os Times do Líder' : 'Toda a Empresa'}
            </div>
          </SelectItem>
          {filteredTeams.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              <div className="flex items-center justify-between gap-2">
                <span>{team.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {team.memberCount}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Active Filters Display */}
      {(selectedLeaderId || selectedTeamId) && (
        <div className="flex items-center gap-2 flex-wrap">
          {selectedLeaderId && (
            <Badge 
              variant="secondary" 
              className="cursor-pointer hover:bg-destructive/20"
              onClick={() => {
                onLeaderChange(null);
                onTeamChange(null);
              }}
            >
              Líder: {leaders.find(l => l.id === selectedLeaderId)?.name}
              <span className="ml-1 text-muted-foreground">×</span>
            </Badge>
          )}
          {selectedTeamId && (
            <Badge 
              variant="secondary" 
              className="cursor-pointer hover:bg-destructive/20"
              onClick={() => onTeamChange(null)}
            >
              Time: {teams.find(t => t.id === selectedTeamId)?.name}
              <span className="ml-1 text-muted-foreground">×</span>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
