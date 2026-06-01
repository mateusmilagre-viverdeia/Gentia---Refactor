import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Award, Sparkles } from "lucide-react";
import { useBadges } from "@/hooks/useBadges";
import { motion } from "framer-motion";
import type { Badge, UserBadge } from "@/types/gamification.types";
import { formatBRTRelative } from "@/lib/datetime";


const TIER_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  bronze: {
    bg: "bg-gradient-to-br from-amber-100 to-orange-100",
    border: "border-amber-300",
    text: "text-amber-700",
    glow: "shadow-amber-200/50",
  },
  silver: {
    bg: "bg-gradient-to-br from-slate-100 to-gray-200",
    border: "border-slate-300",
    text: "text-slate-700",
    glow: "shadow-slate-200/50",
  },
  gold: {
    bg: "bg-gradient-to-br from-yellow-100 to-amber-200",
    border: "border-yellow-400",
    text: "text-yellow-700",
    glow: "shadow-yellow-200/50",
  },
  platinum: {
    bg: "bg-gradient-to-br from-violet-100 to-purple-200",
    border: "border-violet-400",
    text: "text-violet-700",
    glow: "shadow-violet-200/50",
  },
};

interface RecentBadgeCardProps {
  badge: Badge;
  earnedAt?: string;
  index: number;
}

function RecentBadgeCard({ badge, earnedAt, index }: RecentBadgeCardProps) {
  const colors = TIER_COLORS[badge.tier] || TIER_COLORS.bronze;
  
  const timeAgo = earnedAt 
    ? formatBRTRelative(new Date(earnedAt))
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className={`
        relative p-4 rounded-xl border-2 ${colors.bg} ${colors.border}
        shadow-lg ${colors.glow} hover:scale-105 transition-transform cursor-pointer
      `}
    >
      {/* Sparkle effect for new badges */}
      <motion.div
        animate={{ 
          rotate: [0, 360],
          scale: [1, 1.1, 1],
        }}
        transition={{ 
          duration: 3,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute -top-2 -right-2"
      >
        <Sparkles className={`h-5 w-5 ${colors.text}`} />
      </motion.div>

      <div className="flex flex-col items-center text-center space-y-2">
        <span className="text-3xl">{badge.icon}</span>
        <h4 className={`font-semibold text-sm ${colors.text}`}>{badge.name}</h4>
        <span className="text-xs text-muted-foreground">{timeAgo}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-background/80 ${colors.text}`}>
          +{badge.points} pts
        </span>
      </div>
    </motion.div>
  );
}

export function RecentBadgesSection() {
  const navigate = useNavigate();
  const { earnedBadges, isLoading } = useBadges();

  // Get the 3 most recent badges
  const recentBadges = earnedBadges
    .slice(0, 3)
    .filter((ub): ub is UserBadge & { badge: Badge } => ub.badge !== undefined);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Últimas Conquistas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recentBadges.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5 text-muted-foreground" />
            Últimas Conquistas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 space-y-3">
            <div className="text-4xl">🎯</div>
            <p className="text-muted-foreground">
              Você ainda não desbloqueou nenhuma conquista.
            </p>
            <p className="text-sm text-muted-foreground">
              Complete os pilares para ganhar seus primeiros badges!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Últimas Conquistas
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/conquistas")} 
            className="gap-1"
          >
            Ver todas
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {recentBadges.map((userBadge, index) => (
            <RecentBadgeCard
              key={userBadge.id}
              badge={userBadge.badge}
              earnedAt={userBadge.earned_at}
              index={index}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}