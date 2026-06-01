import { Trophy, Flame, Medal, Crown, Star, Award } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import type { PulseBadge, PulseUserBadge, LevelInfo, StreakInfo } from '@/types/pulse.types';

interface GamificationCardProps {
  streak: StreakInfo;
  level: LevelInfo;
  totalPoints: number;
}

export function GamificationCard({ streak, level, totalPoints }: GamificationCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Seu Progresso
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Level Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{level.emoji}</span>
              <div>
                <div className="font-semibold">Nível {level.current}</div>
                <div className="text-xs text-muted-foreground">{level.name}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-primary">{totalPoints.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">pontos</div>
            </div>
          </div>
          <Progress value={level.progress} className="h-2" />
          <div className="text-xs text-muted-foreground text-right">
            {level.nextLevelPoints - level.points} pts para o próximo nível
          </div>
        </div>

        {/* Streak */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <div className="flex items-center gap-2">
            <Flame className="h-6 w-6 text-orange-500" />
            <div>
              <div className="font-semibold text-orange-600">Streak Atual</div>
              <div className="text-xs text-muted-foreground">
                Recorde: {streak.longest} dias
              </div>
            </div>
          </div>
          <div className="text-3xl font-bold text-orange-500">
            {streak.current}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold">{streak.totalResponses}</div>
            <div className="text-xs text-muted-foreground">Respostas totais</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold">{streak.longest}</div>
            <div className="text-xs text-muted-foreground">Maior streak</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface BadgesDisplayProps {
  badges: (PulseUserBadge & { pulse_badges: PulseBadge })[];
  allBadges: PulseBadge[];
}

export function BadgesDisplay({ badges, allBadges }: BadgesDisplayProps) {
  const unlockedIds = new Set(badges.map(b => b.badge_id));

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'gold': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'silver': return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
      case 'platinum': return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
      default: return 'text-amber-600 bg-amber-600/10 border-amber-600/20';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Conquistas
        </CardTitle>
        <CardDescription>
          {badges.length} de {allBadges.length} desbloqueadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
          {allBadges.map(badge => {
            const unlocked = unlockedIds.has(badge.id);
            return (
              <div
                key={badge.id}
                className={`relative flex flex-col items-center p-2 rounded-lg border transition-all ${
                  unlocked
                    ? getTierColor(badge.tier)
                    : 'bg-muted/30 border-muted opacity-50 grayscale'
                }`}
                title={unlocked ? badge.description || badge.name : `${badge.name} - Bloqueado`}
              >
                <span className="text-2xl">{badge.icon_emoji}</span>
                <span className="text-xs font-medium mt-1 text-center line-clamp-1">
                  {badge.name}
                </span>
                {unlocked && (
                  <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
                    <Star className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

interface LeaderboardMiniProps {
  entries: {
    rank: number;
    display_name: string;
    total_points: number;
    current_streak: number;
  }[];
  currentUserId?: string;
}

export function LeaderboardMini({ entries, currentUserId }: LeaderboardMiniProps) {
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-4 w-4 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-4 w-4 text-slate-400" />;
    if (rank === 3) return <Medal className="h-4 w-4 text-amber-600" />;
    return <span className="text-xs font-bold text-muted-foreground">{rank}</span>;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Top 5
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {entries.slice(0, 5).map(entry => (
            <div
              key={entry.rank}
              className={`flex items-center gap-3 p-2 rounded-lg ${
                entry.rank <= 3 ? 'bg-accent/50' : ''
              }`}
            >
              <div className="w-6 flex justify-center">
                {getRankIcon(entry.rank)}
              </div>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {entry.display_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{entry.display_name}</div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center gap-1 text-orange-500">
                  <Flame className="h-3 w-3" />
                  {entry.current_streak}
                </div>
                <Badge variant="secondary" className="text-xs">
                  {entry.total_points.toLocaleString()}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
