import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGamificationStats } from "@/hooks/useGamificationStats";
import { useBadges } from "@/hooks/useBadges";
import { useJourneyProgress } from "@/hooks/useJourneyProgress";
import {
  GamificationHeader,
  JourneyCard,
  ProgressRing,
  BadgeShowcase,
} from "@/components/gamification";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Jornadas = () => {
  const navigate = useNavigate();
  const { 
    level, 
    totalPoints, 
    streakDays, 
    badgesEarned, 
    progressToNextLevel, 
    isLoading: statsLoading 
  } = useGamificationStats();
  const { allBadges, earnedBadges, isLoading: badgesLoading } = useBadges();
  const { 
    journeys, 
    overallProgress,
    totalSteps,
    completedSteps,
    totalPoints: journeyTotalPoints,
    earnedPoints,
    isLoading: journeysLoading 
  } = useJourneyProgress();

  const isLoading = statsLoading || badgesLoading || journeysLoading;

  return (
    <AppLayout 
      title="Sua Jornada"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Jornadas" },
      ]}
    >
      <div className="space-y-8">
        {/* Overall Progress */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <ProgressRing 
                progress={overallProgress} 
                size={120}
                strokeWidth={8}
              />
              <div className="text-center md:text-left">
                <h1 className="text-3xl font-bold mb-2">
                  Progresso Geral: {overallProgress}%
                </h1>
                <p className="text-muted-foreground text-lg">
                  {completedSteps} de {totalSteps} etapas concluídas
                </p>
                <p className="text-primary font-medium mt-2">
                  {earnedPoints.toLocaleString("pt-BR")} / {journeyTotalPoints.toLocaleString("pt-BR")} pontos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <GamificationHeader
          level={level}
          totalPoints={totalPoints}
          streakDays={streakDays}
          badgesEarned={badgesEarned}
          progressToNextLevel={progressToNextLevel}
          isLoading={isLoading}
        />

        {/* All Journeys */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Todas as Jornadas</h2>
          <div className="grid gap-4">
            {journeys.map((journey) => (
              <JourneyCard 
                key={journey.id} 
                journey={journey} 
                defaultExpanded={false}
              />
            ))}
          </div>
        </div>

        {/* Badges Preview */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Conquistas</CardTitle>
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
            <BadgeShowcase
              badges={allBadges}
              earnedBadges={earnedBadges}
              maxDisplay={6}
              showLocked={true}
              showViewAll={false}
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Jornadas;
