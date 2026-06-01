import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Briefcase, 
  MessageSquare, 
  Users, 
  AlertTriangle, 
  MapPin, 
  TrendingUp,
  Target
} from "lucide-react";
import { DISCDimension, DISC_DIMENSIONS } from "@/types/disc.types";
import { DISCLeaderView as LeaderViewData } from "@/data/disc-profiles";
import { cn } from "@/lib/utils";
import { DISCIntensityCard } from "./DISCIntensityCard";

interface DISCLeaderViewProps {
  leaderView: LeaderViewData;
  primaryDimension: DISCDimension;
  secondaryDimension: DISCDimension | null;
  profileSummary: string;
  intensity?: 'baixa' | 'média' | 'alta';
  normalizedScores?: {
    D: number;
    I: number;
    S: number;
    C: number;
  };
}

export function DISCLeaderView({ 
  leaderView, 
  primaryDimension, 
  secondaryDimension,
  profileSummary,
  intensity,
  normalizedScores
}: DISCLeaderViewProps) {
  const primaryInfo = DISC_DIMENSIONS[primaryDimension];
  const secondaryInfo = secondaryDimension ? DISC_DIMENSIONS[secondaryDimension] : null;

  return (
    <div className="space-y-6">
      {/* Intensity Card with Extreme Alerts */}
      {intensity && normalizedScores && (
        <DISCIntensityCard
          intensity={intensity}
          primaryDimension={primaryDimension}
          normalizedScores={normalizedScores}
        />
      )}

      {/* Executive Summary */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Resumo Executivo</CardTitle>
              <CardDescription>Visão estratégica para gestão</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold", primaryInfo.bgColor)}>
                {primaryDimension}
              </div>
              {secondaryInfo && (
                <>
                  <span className="text-muted-foreground">/</span>
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm", secondaryInfo.bgColor)}>
                    {secondaryDimension}
                  </div>
                </>
              )}
            </div>
            <div>
              <Badge variant="outline" className="mb-2">{profileSummary}</Badge>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {leaderView.executiveSummary}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout: How to Lead & How to Communicate */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Como Liderar Esta Pessoa</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {leaderView.howToLead.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-base">Como se Comunicar</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {leaderView.howToCommunicate.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout: Contribution & Risks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-green-200 dark:border-green-900">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              <CardTitle className="text-base">Contribuição para o Time</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {leaderView.teamContribution.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-900">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-base">Riscos para o Time</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {leaderView.teamRisks.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-amber-500 mt-1">⚠</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Best Allocation */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-purple-500" />
            <CardTitle className="text-base">Onde Alocar Melhor</CardTitle>
          </div>
          <CardDescription>Contextos e projetos ideais para maximizar performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {leaderView.bestAllocation.map((item, index) => (
              <div 
                key={index} 
                className="flex items-start gap-2 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900"
              >
                <span className="text-purple-500 mt-0.5">📍</span>
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Development Recommendations */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            <CardTitle className="text-base">Recomendações de Desenvolvimento</CardTitle>
          </div>
          <CardDescription>Ações sugeridas para potencializar este perfil</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3">
            {leaderView.developmentRecommendations.map((item, index) => (
              <div 
                key={index} 
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border"
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 text-xs font-bold shrink-0">
                  {index + 1}
                </span>
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
