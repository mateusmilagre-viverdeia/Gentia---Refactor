import { Card } from "@/components/ui/card";
import type { Badge } from "@/types/gamification.types";
import { Lock, Check } from "lucide-react";

interface BadgeCardProps {
  badge: Badge;
  isEarned: boolean;
  earnedAt?: string;
  isNew?: boolean;
}

const TIER_CONFIG: Record<Badge["tier"], { 
  bg: string; 
  bgEarned: string;
  border: string; 
  text: string; 
  glow: string;
  label: string;
  labelBg: string;
  iconBg: string;
}> = {
  bronze: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    bgEarned: "bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-400",
    glow: "shadow-amber-500/30",
    label: "BRONZE",
    labelBg: "bg-amber-600",
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
  },
  silver: {
    bg: "bg-slate-50 dark:bg-slate-800/30",
    bgEarned: "bg-gradient-to-br from-slate-300 via-slate-400 to-slate-600",
    border: "border-slate-200 dark:border-slate-700",
    text: "text-slate-600 dark:text-slate-400",
    glow: "shadow-slate-400/30",
    label: "PRATA",
    labelBg: "bg-slate-500",
    iconBg: "bg-slate-100 dark:bg-slate-800",
  },
  gold: {
    bg: "bg-yellow-50 dark:bg-yellow-950/30",
    bgEarned: "bg-gradient-to-br from-yellow-300 via-yellow-500 to-amber-600",
    border: "border-yellow-200 dark:border-yellow-800",
    text: "text-yellow-700 dark:text-yellow-400",
    glow: "shadow-yellow-500/40",
    label: "OURO",
    labelBg: "bg-yellow-500",
    iconBg: "bg-yellow-100 dark:bg-yellow-900/50",
  },
  platinum: {
    bg: "bg-violet-50 dark:bg-violet-950/30",
    bgEarned: "bg-gradient-to-br from-violet-400 via-purple-500 to-cyan-500",
    border: "border-violet-200 dark:border-violet-800",
    text: "text-violet-700 dark:text-violet-400",
    glow: "shadow-violet-500/40",
    label: "PLATINA",
    labelBg: "bg-violet-600",
    iconBg: "bg-violet-100 dark:bg-violet-900/50",
  },
};

export function BadgeCard({ badge, isEarned, earnedAt, isNew = false }: BadgeCardProps) {
  const config = TIER_CONFIG[badge.tier];

  if (isEarned) {
    return (
      <Card
        className={`
          relative p-4 flex flex-col min-h-[200px]
          transition-all duration-300 cursor-default overflow-hidden
          ${config.bgEarned} text-white border-0
          shadow-lg hover:shadow-xl ${config.glow}
          ${isNew ? "ring-2 ring-white ring-offset-2 animate-pulse" : ""}
        `}
      >
        {/* Check badge - top right */}
        <div className="absolute top-3 right-3 bg-green-500 rounded-full p-1.5 shadow-md">
          <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
        </div>
        
        {/* Icon container */}
        <div className="flex items-center justify-center mb-3">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
            <span className="text-4xl drop-shadow-lg">{badge.icon}</span>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 flex flex-col text-center">
          {/* Name */}
          <h3 className="text-sm font-bold text-white drop-shadow mb-1 line-clamp-1">
            {badge.name}
          </h3>
          
          {/* Description - now visible! */}
          <p className="text-xs text-white/80 line-clamp-2 mb-auto">
            {badge.description}
          </p>
        </div>

        {/* Footer */}
        <div className="mt-3 pt-2 border-t border-white/20">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/25 text-white">
              {config.label}
            </span>
            <span className="text-xs font-bold text-white/90">
              {badge.points} pts
            </span>
          </div>
          
          {/* Earned date */}
          {earnedAt && (
            <p className="text-[10px] text-white/60 mt-1 text-center">
              {new Date(earnedAt).toLocaleDateString("pt-BR")}
            </p>
          )}
        </div>
      </Card>
    );
  }

  // Locked badge
  return (
    <Card
      className={`
        relative p-4 flex flex-col min-h-[200px]
        transition-all duration-300 cursor-default
        ${config.bg} ${config.border} border
        opacity-70 hover:opacity-85
      `}
    >
      {/* Lock badge - top right */}
      <div className="absolute top-3 right-3">
        <Lock className="h-4 w-4 text-muted-foreground/60" />
      </div>
      
      {/* Icon container */}
      <div className="flex items-center justify-center mb-3">
        <div className={`w-16 h-16 rounded-2xl ${config.iconBg} flex items-center justify-center opacity-50`}>
          <span className="text-4xl grayscale">{badge.icon}</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 flex flex-col text-center">
        {/* Name */}
        <h3 className={`text-sm font-semibold ${config.text} mb-1 line-clamp-1`}>
          {badge.name}
        </h3>
        
        {/* Description - now visible! */}
        <p className="text-xs text-muted-foreground line-clamp-2 mb-auto">
          {badge.description}
        </p>
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${config.labelBg} text-white opacity-50`}>
            {config.label}
          </span>
          <span className="text-xs text-muted-foreground">
            {badge.points} pts
          </span>
        </div>
      </div>
    </Card>
  );
}