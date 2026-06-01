import { Progress } from "@/components/ui/progress";
import { Trophy, Zap, Flame, Award } from "lucide-react";

interface ConquistasHeaderProps {
  level: number;
  totalPoints: number;
  badgesEarned: number;
  totalBadges: number;
  streakDays: number;
  progressToNextLevel: number;
  pointsToNextLevel: number;
}

export function ConquistasHeader({
  level,
  totalPoints,
  badgesEarned,
  totalBadges,
  streakDays,
  progressToNextLevel,
  pointsToNextLevel,
}: ConquistasHeaderProps) {
  const pointsInLevel = 1000 - pointsToNextLevel;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 p-6 text-white mb-6">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Title */}
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="h-8 w-8" />
          <h1 className="text-2xl md:text-3xl font-bold">Galeria de Conquistas</h1>
        </div>
        <p className="text-white/80 mb-6">
          Desbloqueie badges completando fases e atingindo marcos
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Level */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Award className="h-5 w-5 text-yellow-300" />
              <span className="text-sm text-white/80">Nível</span>
            </div>
            <p className="text-3xl font-bold">{level}</p>
          </div>

          {/* Points */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Zap className="h-5 w-5 text-yellow-300" />
              <span className="text-sm text-white/80">Pontos</span>
            </div>
            <p className="text-3xl font-bold">{totalPoints.toLocaleString('pt-BR')}</p>
          </div>

          {/* Streak */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Flame className="h-5 w-5 text-orange-400" />
              <span className="text-sm text-white/80">Sequência</span>
            </div>
            <p className="text-3xl font-bold">{streakDays} <span className="text-lg">dias</span></p>
          </div>

          {/* Badges */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Trophy className="h-5 w-5 text-yellow-300" />
              <span className="text-sm text-white/80">Badges</span>
            </div>
            <p className="text-3xl font-bold">{badgesEarned}<span className="text-lg text-white/60">/{totalBadges}</span></p>
          </div>
        </div>

        {/* Progress to next level */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/80">Progresso para Nível {level + 1}</span>
            <span className="text-sm font-medium">{pointsInLevel} / 1000 XP</span>
          </div>
          <Progress 
            value={progressToNextLevel} 
            className="h-3 bg-white/20"
          />
          <p className="text-xs text-white/60 mt-2 text-center">
            Faltam {pointsToNextLevel} XP para o próximo nível
          </p>
        </div>
      </div>
    </div>
  );
}
