import { Trophy, Star, Flame, Award } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface GamificationHeaderProps {
  level: number;
  totalPoints: number;
  streakDays: number;
  badgesEarned: number;
  progressToNextLevel: number;
  isLoading?: boolean;
}

export function GamificationHeader({
  level,
  totalPoints,
  streakDays,
  badgesEarned,
  progressToNextLevel,
  isLoading = false,
}: GamificationHeaderProps) {
  const stats = [
    {
      label: "Nível",
      value: level,
      icon: Trophy,
      color: "text-amber-600/80 dark:text-amber-400/80",
      bgColor: "bg-amber-500/8 dark:bg-amber-500/15",
    },
    {
      label: "Pontos",
      value: totalPoints.toLocaleString("pt-BR"),
      icon: Star,
      color: "text-foreground/70",
      bgColor: "bg-muted",
    },
    {
      label: "Streak",
      value: `${streakDays} dias`,
      icon: Flame,
      color: "text-orange-600/80 dark:text-orange-400/80",
      bgColor: "bg-orange-500/8 dark:bg-orange-500/15",
    },
    {
      label: "Badges",
      value: badgesEarned,
      icon: Award,
      color: "text-purple-600/80 dark:text-purple-400/80",
      bgColor: "bg-purple-500/8 dark:bg-purple-500/15",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="stat-card flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-3 w-8" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="stat-card flex items-center gap-3"
          >
            <div className={`icon-container rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-xl font-semibold tracking-tight">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 px-1">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          Nível {level}
        </span>
        <Progress value={progressToNextLevel} className="flex-1 h-1.5" />
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          Nível {level + 1}
        </span>
      </div>
    </div>
  );
}
