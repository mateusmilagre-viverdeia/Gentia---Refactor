import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SortableHeader } from '@/components/ui/sortable-header';
import { useTableSort } from '@/hooks/useTableSort';
import {
  usePulseParticipationRanking,
  ParticipationStatusFilter,
  MemberParticipation,
} from '@/hooks/usePulseParticipationRanking';
import { MemberParticipationDetail } from './MemberParticipationDetail';
import { RefreshCw, Users, AlertTriangle, UserX, Flame, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatBRTRelative } from "@/lib/datetime";


interface Props {
  accountId: string | null;
  periodDays?: number;
}

export function PulseParticipationRanking({ accountId, periodDays = 30 }: Props) {
  const {
    members,
    loading,
    period,
    setPeriod,
    statusFilter,
    setStatusFilter,
    teamFilter,
    setTeamFilter,
    fetchParticipation,
    stats,
    teams,
  } = usePulseParticipationRanking(accountId);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<MemberParticipation | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Sync external period
  useEffect(() => {
    if (periodDays !== period) {
      setPeriod(periodDays as any);
    }
  }, [periodDays]);

  useEffect(() => {
    if (accountId) {
      fetchParticipation(periodDays);
    }
  }, [accountId, periodDays, fetchParticipation]);

  // Filter by search
  const searchFiltered = useMemo(() => {
    if (!searchTerm.trim()) return members;
    const term = searchTerm.toLowerCase();
    return members.filter(
      (m) =>
        m.userName.toLowerCase().includes(term) ||
        m.userEmail.toLowerCase().includes(term)
    );
  }, [members, searchTerm]);

  // Sort
  const { sortConfig, handleSort, sortedData } = useTableSort(searchFiltered, {
    key: 'participationRate',
    direction: 'desc',
  });

  const getStatusBadge = (status: 'active' | 'at_risk' | 'inactive') => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Ativo</Badge>;
      case 'at_risk':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Em Risco</Badge>;
      case 'inactive':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Inativo</Badge>;
    }
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-500';
    if (rate >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  const handleMemberClick = (member: MemberParticipation) => {
    setSelectedMember(member);
    setDetailOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Membros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">
              Média: {stats.avgParticipationRate}%
              {stats.avgParticipationRate >= 80 ? (
                <span className="text-green-600 ml-1">✓ Meta atingida</span>
              ) : (
                <span className="text-amber-600 ml-1">↓ Abaixo da meta (80%)</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <div className="h-3 w-3 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeMembers}</div>
            <p className="text-xs text-muted-foreground">Responderam nos últimos 3 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Risco</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.atRiskMembers}</div>
            <p className="text-xs text-muted-foreground">Sem resposta há 4-7 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inativos</CardTitle>
            <UserX className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.inactiveMembers}</div>
            <p className="text-xs text-muted-foreground">Sem resposta há mais de 7 dias</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>Ranking de Participação</CardTitle>
              <CardDescription>
                Acompanhe quem está respondendo o Pulse regularmente
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-[220px] h-9"
                />
              </div>

              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as ParticipationStatusFilter)}
              >
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="at_risk">Em Risco</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>

              {teams.length > 0 && (
                <Select
                  value={teamFilter || 'all'}
                  onValueChange={(v) => setTeamFilter(v === 'all' ? null : v)}
                >
                  <SelectTrigger className="w-[160px] h-9">
                    <SelectValue placeholder="Todos os times" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os times</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => fetchParticipation(periodDays)}
                disabled={loading}
              >
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sortedData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum membro encontrado com os filtros selecionados.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader
                    label="Colaborador"
                    sortKey="userName"
                    currentSortKey={sortConfig.key}
                    direction={sortConfig.direction}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Time"
                    sortKey="teamName"
                    currentSortKey={sortConfig.key}
                    direction={sortConfig.direction}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Participação"
                    sortKey="participationRate"
                    currentSortKey={sortConfig.key}
                    direction={sortConfig.direction}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Última Resposta"
                    sortKey="lastResponseDate"
                    currentSortKey={sortConfig.key}
                    direction={sortConfig.direction}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Streak"
                    sortKey="streak"
                    currentSortKey={sortConfig.key}
                    direction={sortConfig.direction}
                    onSort={handleSort}
                    className="text-center"
                  />
                  <SortableHeader
                    label="Status"
                    sortKey="status"
                    currentSortKey={sortConfig.key}
                    direction={sortConfig.direction}
                    onSort={handleSort}
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((member) => (
                  <TableRow
                    key={member.userId}
                    className="cursor-pointer"
                    onClick={() => handleMemberClick(member)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(member.userName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.userName}</div>
                          <div className="text-xs text-muted-foreground">{member.userEmail}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {member.teamName ? (
                        <Badge variant="outline">{member.teamName}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 min-w-[140px]">
                        <Progress value={member.participationRate} className="h-2 flex-1">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              getProgressColor(member.participationRate)
                            )}
                            style={{ width: `${member.participationRate}%` }}
                          />
                        </Progress>
                        <span
                          className={cn(
                            'text-sm font-medium min-w-[40px] text-right',
                            member.participationRate >= 80 && 'text-green-600',
                            member.participationRate >= 50 && member.participationRate < 80 && 'text-amber-600',
                            member.participationRate < 50 && 'text-red-600'
                          )}
                        >
                          {member.participationRate}%
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {member.respondedDays}/{member.totalDays} dias
                      </div>
                    </TableCell>
                    <TableCell>
                      {member.lastResponseDate ? (
                        <span className="text-sm">
                          {formatBRTRelative(new Date(member.lastResponseDate))}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Nunca</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {member.streak > 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          <Flame className="h-4 w-4 text-orange-500" />
                          <span className="font-medium">{member.streak}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(member.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Drill-down dialog */}
      <MemberParticipationDetail
        member={selectedMember}
        accountId={accountId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        periodDays={periodDays}
      />
    </div>
  );
}
