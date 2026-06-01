import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users } from 'lucide-react';
import type { PulseTeam } from '@/hooks/usePulseTeams';

interface CultureTeamFilterProps {
  teams: PulseTeam[];
  selectedTeamId: string | null;
  onTeamChange: (teamId: string | null) => void;
  loading?: boolean;
}

export function CultureTeamFilter({ teams, selectedTeamId, onTeamChange, loading }: CultureTeamFilterProps) {
  const activeTeams = teams.filter(t => t.is_active !== false);

  if (activeTeams.length === 0) return null;

  return (
    <Select
      value={selectedTeamId ?? 'all'}
      onValueChange={(val) => onTeamChange(val === 'all' ? null : val)}
      disabled={loading}
    >
      <SelectTrigger className="w-[200px]">
        <Users className="h-4 w-4 mr-2 text-muted-foreground" />
        <SelectValue placeholder="Todos os times" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os times</SelectItem>
        {activeTeams.map(team => (
          <SelectItem key={team.id} value={team.id}>
            {team.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
