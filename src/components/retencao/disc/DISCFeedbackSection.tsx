import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Target, 
  Zap, 
  AlertTriangle, 
  Flame, 
  Home,
  Sparkles,
  MessageCircle,
  CheckCircle,
  XCircle,
  Lightbulb,
  TrendingUp
} from "lucide-react";
import { DISCCombinedProfile } from "@/data/disc-profiles";
import { DISCDimension, DISC_DIMENSIONS } from "@/types/disc.types";
import { cn } from "@/lib/utils";

interface DISCFeedbackSectionProps {
  combinedProfile: DISCCombinedProfile;
  primaryDimension: DISCDimension;
  secondaryDimension: DISCDimension | null;
}

export function DISCFeedbackSection({ 
  combinedProfile, 
  primaryDimension,
  secondaryDimension 
}: DISCFeedbackSectionProps) {
  const primaryInfo = DISC_DIMENSIONS[primaryDimension];
  const secondaryInfo = secondaryDimension ? DISC_DIMENSIONS[secondaryDimension] : null;

  return (
    <div className="space-y-6">
      {/* Profile Summary Header */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-muted/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-xl">
                {combinedProfile.summary}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Perfil {primaryInfo.name}
                {secondaryInfo && ` com influência de ${secondaryInfo.name}`}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Como você tende a agir */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className={cn("p-2 rounded-lg", primaryInfo.bgColor.replace('bg-', 'bg-') + '/10')}>
              <Target className={cn("h-5 w-5", primaryInfo.color)} />
            </div>
            Como você tende a agir
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed">
            {combinedProfile.behavior}
          </p>
        </CardContent>
      </Card>

      {/* Suas Forças Naturais */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Zap className="h-5 w-5 text-green-600" />
            </div>
            Suas forças naturais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {combinedProfile.strengths.map((strength, index) => (
              <div 
                key={index}
                className="flex items-start gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900"
              >
                <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {index + 1}
                </div>
                <span className="text-sm">{strength}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pontos de Atenção */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            Pontos de atenção
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {combinedProfile.watchPoints.map((point, index) => (
              <div 
                key={index}
                className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900"
              >
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{point}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* O que motiva você */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="p-2 rounded-lg bg-red-500/10">
              <Flame className="h-5 w-5 text-red-600" />
            </div>
            O que motiva você
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {combinedProfile.motivators.map((motivator, index) => (
              <Badge 
                key={index} 
                variant="secondary"
                className="py-2 px-3 text-sm font-normal"
              >
                {motivator}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ambiente Ideal */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Home className="h-5 w-5 text-blue-600" />
            </div>
            Seu ambiente ideal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {combinedProfile.idealEnvironment.map((env, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900"
              >
                <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                <span className="text-sm">{env}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Como se comunicar com você */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <MessageCircle className="h-5 w-5 text-purple-600" />
            </div>
            Como se comunicar com você
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* O que funciona */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                O que funciona
              </h4>
              <div className="space-y-2">
                {combinedProfile.communicationStyle.howTheyPrefer.map((item, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900"
                  >
                    <CheckCircle className="h-3 w-3 text-green-600 mt-1 flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* O que evitar */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2 text-red-700 dark:text-red-400">
                <XCircle className="h-4 w-4" />
                O que evitar
              </h4>
              <div className="space-y-2">
                {combinedProfile.communicationStyle.whatToAvoid.map((item, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900"
                  >
                    <XCircle className="h-3 w-3 text-red-600 mt-1 flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dicas para quem trabalha com você */}
          <div className="pt-2">
            <h4 className="text-sm font-medium flex items-center gap-2 text-purple-700 dark:text-purple-400 mb-2">
              <Lightbulb className="h-4 w-4" />
              Dicas para quem trabalha com você
            </h4>
            <div className="flex flex-wrap gap-2">
              {combinedProfile.communicationStyle.tips.map((tip, index) => (
                <Badge 
                  key={index} 
                  variant="outline"
                  className="py-1.5 px-3 text-sm font-normal border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/20"
                >
                  {tip}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dicas de Desenvolvimento */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="p-2 rounded-lg bg-teal-500/10">
              <TrendingUp className="h-5 w-5 text-teal-600" />
            </div>
            Dicas para seu desenvolvimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {combinedProfile.developmentTips.map((tip, index) => (
              <div 
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900"
              >
                <div className="w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {index + 1}
                </div>
                <span className="text-sm">{tip}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
