import { Badge as BadgeType, UserBadge } from "@/types/gamification.types";
import { BadgeCard } from "./BadgeCard";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BadgeShowcaseProps {
  badges: BadgeType[];
  earnedBadges: UserBadge[];
  maxDisplay?: number;
  showLocked?: boolean;
  showViewAll?: boolean;
}

export function BadgeShowcase({
  badges,
  earnedBadges,
  maxDisplay = 6,
  showLocked = true,
  showViewAll = true,
}: BadgeShowcaseProps) {
  const navigate = useNavigate();

  const earnedBadgeIds = new Set(earnedBadges.map((ub) => ub.badge_id));
  const recentBadgeIds = new Set(
    earnedBadges
      .filter((ub) => {
        if (!ub.earned_at) return false;
        const earnedDate = new Date(ub.earned_at);
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return earnedDate > dayAgo;
      })
      .map((ub) => ub.badge_id)
  );

  // Sort: earned first, then by tier
  const sortedBadges = [...badges].sort((a, b) => {
    const aEarned = earnedBadgeIds.has(a.id);
    const bEarned = earnedBadgeIds.has(b.id);
    
    if (aEarned && !bEarned) return -1;
    if (!aEarned && bEarned) return 1;
    
    const tierOrder = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
    return tierOrder[a.tier] - tierOrder[b.tier];
  });

  const displayBadges = showLocked
    ? sortedBadges.slice(0, maxDisplay)
    : sortedBadges.filter((b) => earnedBadgeIds.has(b.id)).slice(0, maxDisplay);

  const getEarnedAt = (badgeId: string) => {
    const earned = earnedBadges.find((ub) => ub.badge_id === badgeId);
    return earned?.earned_at || undefined;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {displayBadges.map((badge) => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            isEarned={earnedBadgeIds.has(badge.id)}
            earnedAt={getEarnedAt(badge.id)}
            isNew={recentBadgeIds.has(badge.id)}
          />
        ))}
      </div>

      {showViewAll && badges.length > maxDisplay && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            onClick={() => navigate("/conquistas")}
            className="gap-2"
          >
            Ver todas as conquistas
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
