import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useBadges } from "@/hooks/useBadges";
import { useGamificationStats } from "@/hooks/useGamificationStats";
import { useAchievementChecker } from "@/hooks/useAchievementChecker";
import { BadgeCard } from "@/components/gamification/BadgeCard";
import { ConquistasHeader } from "@/components/gamification/ConquistasHeader";
import { 
  Layers, Target, TrendingUp, Sparkles, RefreshCw,
  BarChart3, ClipboardList, RotateCcw, Zap, Unlock, BadgeCheck
} from "lucide-react";
import { toast } from "sonner";
import type { Badge, BadgeCategory } from "@/types/gamification.types";

const CATEGORY_CONFIG: Record<BadgeCategory, { 
  label: string; 
  icon: React.ReactNode; 
  description: string;
}> = {
  phase: {
    label: "Fases",
    icon: <Layers className="h-4 w-4" />,
    description: "Conquistas por completar fases das jornadas",
  },
  milestone: {
    label: "Marcos",
    icon: <Target className="h-4 w-4" />,
    description: "Marcos importantes na sua jornada",
  },
  performance: {
    label: "Performance",
    icon: <TrendingUp className="h-4 w-4" />,
    description: "Conquistas de desempenho e consistência",
  },
  special: {
    label: "Especiais",
    icon: <Sparkles className="h-4 w-4" />,
    description: "Conquistas especiais e raras",
  },
  progress: {
    label: "Progresso",
    icon: <BarChart3 className="h-4 w-4" />,
    description: "Conquistas por progresso parcial em etapas (25%, 50%, 75%)",
  },
  action_plan: {
    label: "Plano de Ação",
    icon: <ClipboardList className="h-4 w-4" />,
    description: "Conquistas relacionadas ao plano de ação",
  },
  iteration: {
    label: "Iteração",
    icon: <RotateCcw className="h-4 w-4" />,
    description: "Conquistas por atualizar e melhorar planos",
  },
  speed: {
    label: "Velocidade",
    icon: <Zap className="h-4 w-4" />,
    description: "Conquistas por completar etapas rapidamente",
  },
  unlock: {
    label: "Desbloqueio",
    icon: <Unlock className="h-4 w-4" />,
    description: "Conquistas por desbloquear novas jornadas",
  },
  quality: {
    label: "Qualidade",
    icon: <BadgeCheck className="h-4 w-4" />,
    description: "Conquistas por preenchimento de qualidade",
  },
};

// Map old categories to new ones
const CATEGORY_MAP: Record<string, string> = {
  journey: "phase",
  pillar: "phase",
  streak: "performance",
};

const Conquistas = () => {
  const badgesData = useBadges();
  const achievementChecker = useAchievementChecker();
  const gamificationStats = useGamificationStats();
  
  const { allBadges, earnedBadges, isLoading, refetch } = badgesData;
  const { checkAchievements } = achievementChecker;
  const { 
    level, 
    totalPoints, 
    badgesEarned, 
    streakDays, 
    progressToNextLevel,
    pointsToNextLevel,
  } = gamificationStats;
  const [activeTab, setActiveTab] = useState("all");
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncAchievements = async () => {
    setIsSyncing(true);
    try {
      // Check all common step completions - includes all functional pages
      const stepsToCheck = [
        // Diagnóstico
        'assessment_roip',
        // Cultura
        'energia', 'desenvolvimento', 'valores', 'missao', 'visao',
        'decisao', 'indicadores', 'projetos', 'evento', 'rituais', 'culture_code',
        // Atração
        'vendendo', 'funil', 'perguntas', 'organograma',
        // Retenção
        'analisador', 'desempenho', 'habilidade', 'maturidade'
      ];
      const result = await checkAchievements({ completedSteps: stepsToCheck });
      await refetch();
      
      if (result?.newBadges && result.newBadges.length > 0) {
        toast.success('Novas conquistas desbloqueadas!', {
          description: `Você conquistou ${result.newBadges.length} novo(s) badge(s)!`,
        });
      } else {
        toast.success('Conquistas sincronizadas!', {
          description: 'Seus badges estão atualizados.',
        });
      }
    } catch (error) {
      console.error('Error syncing achievements:', error);
      toast.error('Erro ao sincronizar', {
        description: 'Tente novamente mais tarde.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const earnedBadgeIds = new Set(earnedBadges.map((ub) => ub.badge_id));

  const getEarnedAt = (badgeId: string) => {
    const earned = earnedBadges.find((ub) => ub.badge_id === badgeId);
    return earned?.earned_at || undefined;
  };

  // Normalize categories
  const getNormalizedCategory = (category: string): string => {
    return CATEGORY_MAP[category] || category;
  };

  // Filter badges by category
  const filterBadgesByCategory = (category: string): Badge[] => {
    if (category === "all") return allBadges;
    return allBadges.filter(
      (badge) => getNormalizedCategory(badge.category) === category
    );
  };

  // Sort badges: earned first, then by tier (platinum > gold > silver > bronze)
  const sortBadges = (badges: Badge[]): Badge[] => {
    const tierOrder = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
    return [...badges].sort((a, b) => {
      const aEarned = earnedBadgeIds.has(a.id);
      const bEarned = earnedBadgeIds.has(b.id);
      
      if (aEarned !== bEarned) return aEarned ? -1 : 1;
      return tierOrder[a.tier] - tierOrder[b.tier];
    });
  };

  const getTabBadges = (tab: string) => {
    const badges = filterBadgesByCategory(tab);
    return sortBadges(badges);
  };

  const getCategoryCount = (category: string): { earned: number; total: number } => {
    const badges = filterBadgesByCategory(category);
    const earned = badges.filter((b) => earnedBadgeIds.has(b.id)).length;
    return { earned, total: badges.length };
  };

  // Get categories that have badges
  const categoriesWithBadges = Object.keys(CATEGORY_CONFIG).filter(
    (key) => filterBadgesByCategory(key).length > 0
  );

  if (isLoading) {
    return (
      <AppLayout title="Conquistas">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            <p className="text-muted-foreground">Carregando conquistas...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="Conquistas"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Conquistas" },
      ]}
    >
      <div className="space-y-6">
        {/* Header with stats */}
        <ConquistasHeader
          level={level}
          totalPoints={totalPoints}
          badgesEarned={badgesEarned}
          totalBadges={allBadges.length}
          streakDays={streakDays}
          progressToNextLevel={progressToNextLevel}
          pointsToNextLevel={pointsToNextLevel}
        />

        {/* Sync Button */}
        <div className="flex justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSyncAchievements}
            disabled={isSyncing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Conquistas'}
          </Button>
        </div>

        {/* Category Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="inline-flex h-auto p-1 w-max">
              <TabsTrigger value="all" className="py-2 px-3 text-xs sm:text-sm">
                Todos
                <span className="ml-1 text-xs text-muted-foreground">
                  ({allBadges.length})
                </span>
              </TabsTrigger>
              {categoriesWithBadges.map((key) => {
                const config = CATEGORY_CONFIG[key as BadgeCategory];
                const count = getCategoryCount(key);
                return (
                  <TabsTrigger key={key} value={key} className="py-2 px-3 text-xs sm:text-sm gap-1">
                    <span className="hidden sm:inline">{config.icon}</span>
                    {config.label}
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({count.earned}/{count.total})
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* All badges */}
          <TabsContent value="all" className="mt-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {sortBadges(allBadges).map((badge) => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  isEarned={earnedBadgeIds.has(badge.id)}
                  earnedAt={getEarnedAt(badge.id)}
                />
              ))}
            </div>
          </TabsContent>

          {/* Category tabs */}
          {categoriesWithBadges.map((key) => {
            const config = CATEGORY_CONFIG[key as BadgeCategory];
            const badges = getTabBadges(key);
            return (
              <TabsContent key={key} value={key} className="mt-6">
                {/* Category description */}
                <div className="mb-4 p-4 rounded-lg bg-muted/50 flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10 text-primary">
                    {config.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold">{config.label}</h3>
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                  </div>
                </div>

                {badges.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {badges.map((badge) => (
                      <BadgeCard
                        key={badge.id}
                        badge={badge}
                        isEarned={earnedBadgeIds.has(badge.id)}
                        earnedAt={getEarnedAt(badge.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-muted-foreground">
                        Nenhum badge nesta categoria ainda.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Conquistas;