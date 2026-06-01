import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useGamificationStats } from "@/hooks/useGamificationStats";
import { useBadges } from "@/hooks/useBadges";
import { useJourneyProgress } from "@/hooks/useJourneyProgress";
import {
  GamificationHeader,
  NextStepCard,
  JourneyCard,
  RecentBadgesSection,
} from "@/components/gamification";

const Home = () => {
  const navigate = useNavigate();
  const { level, totalPoints, streakDays, badgesEarned, progressToNextLevel, isLoading: statsLoading } = useGamificationStats();
  const { isLoading: badgesLoading } = useBadges();
  const { journeys, nextSuggestedStep, isLoading: journeysLoading } = useJourneyProgress();

  const isLoading = statsLoading || badgesLoading || journeysLoading;

  // Find the journey for the next suggested step
  const nextStepJourney = nextSuggestedStep
    ? journeys.find((j) => j.steps.some((s) => s.id === nextSuggestedStep.id))
    : null;

  return (
    <AppLayout title="Home">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Bem-vindo ao Gent.IA</h1>
        </div>

        {/* Gamification Stats */}
        <GamificationHeader
          level={level}
          totalPoints={totalPoints}
          streakDays={streakDays}
          badgesEarned={badgesEarned}
          progressToNextLevel={progressToNextLevel}
          isLoading={isLoading}
        />

        {/* Next Step Suggestion */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Próximo Passo</h2>
          <NextStepCard
            step={nextSuggestedStep}
            journeyTitle={nextStepJourney?.title || ""}
            journeyIcon={nextStepJourney?.icon || "🎯"}
            onContinue={() => nextSuggestedStep && navigate(nextSuggestedStep.route)}
          />
        </div>

        {/* Journey Overview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Suas Jornadas</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/jornadas")} className="gap-1 text-xs">
              Ver todas
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          <div className="grid gap-4">
            {journeys.slice(0, 2).map((journey) => (
              <JourneyCard key={journey.id} journey={journey} />
            ))}
          </div>
        </div>

        {/* Recent Badges - New enhanced section */}
        <RecentBadgesSection />
      </div>
    </AppLayout>
  );
};

export default Home;
