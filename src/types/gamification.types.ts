export interface Badge {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  category: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  points: number;
  requirement: Record<string, unknown> | null;
  created_at: string | null;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string | null;
  badge?: Badge;
}

export interface GamificationStats {
  id: string;
  account_id: string;
  total_points: number | null;
  level: number | null;
  badges_earned: number | null;
  streak_days: number | null;
  last_activity_date: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface JourneyStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  points: number;
  status: 'locked' | 'available' | 'in_progress' | 'completed' | 'skipped';
  progress_percentage: number;
}

export interface Journey {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  steps: JourneyStep[];
  totalSteps: number;
  completedSteps: number;
  totalPoints: number;
  earnedPoints: number;
}

export interface JourneyProgress {
  id: string;
  account_id: string;
  journey_id: string;
  step_id: string;
  status: string;
  progress_percentage: number | null;
  completed_at: string | null;
  skipped_at: string | null;
  updated_at: string | null;
}

// Badge category types - expanded
export type BadgeCategory = 
  | 'phase' 
  | 'milestone' 
  | 'performance' 
  | 'special'
  | 'progress'      // partial step progress (25%, 50%, 75%)
  | 'action_plan'   // action plan related
  | 'iteration'     // plan updates/iterations
  | 'speed'         // completion speed
  | 'unlock'        // journey unlocks
  | 'quality';      // quality of completion

export type TierColor = {
  bg: string;
  border: string;
  text: string;
  glow: string;
};

export const TIER_COLORS: Record<Badge['tier'], TierColor> = {
  bronze: {
    bg: 'bg-amber-900/20',
    border: 'border-amber-700',
    text: 'text-amber-600',
    glow: 'shadow-amber-500/20',
  },
  silver: {
    bg: 'bg-slate-400/20',
    border: 'border-slate-400',
    text: 'text-slate-400',
    glow: 'shadow-slate-400/20',
  },
  gold: {
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500',
    text: 'text-yellow-500',
    glow: 'shadow-yellow-500/30',
  },
  platinum: {
    bg: 'bg-cyan-400/20',
    border: 'border-cyan-400',
    text: 'text-cyan-400',
    glow: 'shadow-cyan-400/30',
  },
};

// Category configuration for UI
export const CATEGORY_CONFIG: Record<BadgeCategory, {
  label: string;
  description: string;
  icon: string;
}> = {
  phase: {
    label: 'Fases',
    description: 'Conquistas por completar etapas',
    icon: '🎯',
  },
  milestone: {
    label: 'Marcos',
    description: 'Conquistas por alcançar marcos importantes',
    icon: '🏆',
  },
  performance: {
    label: 'Performance',
    description: 'Conquistas por uso consistente e performance',
    icon: '🔥',
  },
  special: {
    label: 'Especiais',
    description: 'Conquistas especiais e exclusivas',
    icon: '⭐',
  },
  progress: {
    label: 'Progresso',
    description: 'Conquistas por progresso parcial em etapas',
    icon: '📈',
  },
  action_plan: {
    label: 'Plano de Ação',
    description: 'Conquistas relacionadas ao plano de ação',
    icon: '📋',
  },
  iteration: {
    label: 'Iteração',
    description: 'Conquistas por atualizar e melhorar planos',
    icon: '🔄',
  },
  speed: {
    label: 'Velocidade',
    description: 'Conquistas por completar etapas rapidamente',
    icon: '⚡',
  },
  unlock: {
    label: 'Desbloqueio',
    description: 'Conquistas por desbloquear novas jornadas',
    icon: '🔓',
  },
  quality: {
    label: 'Qualidade',
    description: 'Conquistas por preenchimento de qualidade',
    icon: '✨',
  },
};