import { useEffect, useState, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface Team {
  id: string;
  name: string;
}

interface TeamEngagementFilterProps {
  accountId: string | null;
  selectedTeamId: string | null;
  onTeamChange: (teamId: string | null) => void;
}

export function TeamEngagementFilter({ accountId, selectedTeamId, onTeamChange }: TeamEngagementFilterProps) {
  const [teams, setTeams] = useState<Team[]>([]);

  const fetchTeams = useCallback(async () => {
    if (!accountId) return;
    const { data } = await supabase
      .from('pulse_teams')
      .select('id, name')
      .eq('account_id', accountId)
      .eq('is_active', true)
      .order('name');
    if (data) setTeams(data);
  }, [accountId]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  if (teams.length === 0) return null;

  return (
    <Select
      value={selectedTeamId || 'all'}
      onValueChange={(v) => onTeamChange(v === 'all' ? null : v)}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Todos os times" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os times</SelectItem>
        {teams.map(t => (
          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
