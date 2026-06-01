import { useEffect, useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Flame, Calendar, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MemberParticipation } from '@/hooks/usePulseParticipationRanking';

interface MemberParticipationDetailProps {
  member: MemberParticipation | null;
  accountId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  periodDays: number;
}

interface DayRecord {
  date: string;
  responded: boolean;
}

export function MemberParticipationDetail({
  member,
  accountId,
  open,
  onOpenChange,
  periodDays,
}: MemberParticipationDetailProps) {
  const [dayRecords, setDayRecords] = useState<DayRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !member || !accountId) return;

    async function fetchDetail() {
      setLoading(true);
      try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - periodDays);
        const startStr = startDate.toISOString().split('T')[0];

        // Get assignments in period
        const { data: assignments } = await supabase
          .from('pulse_daily_assignments')
          .select('date')
          .eq('account_id', accountId!)
          .gte('date', startStr)
          .order('date');

        // Get user responses
        const { data: responses } = await supabase
          .from('pulse_responses')
          .select('date')
          .eq('account_id', accountId!)
          .eq('respondent_user_id', member!.userId)
          .gte('date', startStr);

        const responseDates = new Set(responses?.map((r) => r.date) || []);
        const records: DayRecord[] = (assignments || []).map((a) => ({
          date: a.date,
          responded: responseDates.has(a.date),
        }));

        setDayRecords(records);
      } catch (err) {
        console.error('Error fetching member detail:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDetail();
  }, [open, member?.userId, accountId, periodDays]);

  const weeklyFrequency = useMemo(() => {
    const dayBuckets: Record<number, { total: number; responded: number }> = {};
    for (let i = 0; i < 7; i++) dayBuckets[i] = { total: 0, responded: 0 };

    dayRecords.forEach((r) => {
      const d = new Date(r.date + 'T12:00:00');
      const jsDay = d.getDay();
      const dayIdx = jsDay === 0 ? 6 : jsDay - 1;
      dayBuckets[dayIdx].total++;
      if (r.responded) dayBuckets[dayIdx].responded++;
    });

    const labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    return labels.map((label, i) => {
      const b = dayBuckets[i];
      return {
        label,
        rate: b.total > 0 ? Math.round((b.responded / b.total) * 100) : null,
      };
    });
  }, [dayRecords]);

  const firstResponse = dayRecords.find((r) => r.responded)?.date;
  const lastResponse = [...dayRecords].reverse().find((r) => r.responded)?.date;

  if (!member) return null;

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{getInitials(member.userName)}</AvatarFallback>
            </Avatar>
            <div>
              <div>{member.userName}</div>
              <div className="text-sm font-normal text-muted-foreground">{member.userEmail}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-32" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{member.participationRate}%</div>
                <div className="text-xs text-muted-foreground">Participação</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                  {member.streak > 0 && <Flame className="h-5 w-5 text-orange-500" />}
                  {member.streak}
                </div>
                <div className="text-xs text-muted-foreground">Streak</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">
                  {member.respondedDays}/{member.totalDays}
                </div>
                <div className="text-xs text-muted-foreground">Dias</div>
              </div>
            </div>

            {/* Dates */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Primeira:</span>
                <span>{firstResponse ? new Date(firstResponse + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Última:</span>
                <span>{lastResponse ? new Date(lastResponse + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</span>
              </div>
            </div>

            {/* Weekly frequency */}
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4" />
                Frequência por Dia da Semana
              </h4>
              <div className="grid grid-cols-7 gap-1.5">
                {weeklyFrequency.map((d) => (
                  <div
                    key={d.label}
                    className={cn(
                      'flex flex-col items-center rounded-md p-2',
                      d.rate === null
                        ? 'bg-muted text-muted-foreground'
                        : d.rate >= 80
                        ? 'bg-green-500/15 text-green-700 dark:text-green-400'
                        : d.rate >= 50
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                        : 'bg-red-500/15 text-red-700 dark:text-red-400'
                    )}
                  >
                    <span className="text-[10px] font-medium">{d.label}</span>
                    <span className="text-sm font-bold">{d.rate !== null ? `${d.rate}%` : '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Day-by-day timeline (last 30 entries max for visual) */}
            <div>
              <h4 className="text-sm font-medium mb-2">Histórico de Respostas</h4>
              <div className="flex flex-wrap gap-1">
                {dayRecords.slice(-60).map((r) => (
                  <div
                    key={r.date}
                    title={`${new Date(r.date + 'T12:00:00').toLocaleDateString('pt-BR')} — ${r.responded ? 'Respondeu' : 'Não respondeu'}`}
                    className={cn(
                      'w-3 h-3 rounded-sm',
                      r.responded ? 'bg-green-500' : 'bg-red-500/30'
                    )}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-green-500" /> Respondeu
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-red-500/30" /> Não respondeu
                </span>
              </div>
            </div>

            {/* Team / Status */}
            <div className="flex items-center gap-2">
              {member.teamName && <Badge variant="outline">{member.teamName}</Badge>}
              <Badge
                className={cn(
                  member.status === 'active' && 'bg-green-500/10 text-green-600 border-green-500/20',
                  member.status === 'at_risk' && 'bg-amber-500/10 text-amber-600 border-amber-500/20',
                  member.status === 'inactive' && 'bg-red-500/10 text-red-600 border-red-500/20'
                )}
              >
                {member.status === 'active' ? 'Ativo' : member.status === 'at_risk' ? 'Em Risco' : 'Inativo'}
              </Badge>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
