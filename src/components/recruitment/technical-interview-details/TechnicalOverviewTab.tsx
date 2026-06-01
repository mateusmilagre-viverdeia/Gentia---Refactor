import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle, AlertTriangle, TrendingUp, TrendingDown, Clock, Calendar } from 'lucide-react';

import type { TechnicalInterviewDetails } from '@/hooks/useTechnicalInterviewDetails';
import { formatBRT } from "@/lib/datetime";

interface TechnicalOverviewTabProps {
  interview: TechnicalInterviewDetails;
}

export function TechnicalOverviewTab({ interview }: TechnicalOverviewTabProps) {
  const getRecommendationConfig = (rec: string | null) => {
    switch (rec) {
      case 'recommended':
        return {
          label: 'Recomendado',
          color: 'bg-green-500/10 text-green-600 border-green-500/20',
          icon: CheckCircle2,
          description: 'Candidato aprovado na avaliação técnica',
        };
      case 'conditional':
        return {
          label: 'Com Ressalvas',
          color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
          icon: AlertTriangle,
          description: 'Candidato aprovado com ressalvas',
        };
      case 'not_recommended':
        return {
          label: 'Não Recomendado',
          color: 'bg-red-500/10 text-red-600 border-red-500/20',
          icon: XCircle,
          description: 'Candidato não atende aos requisitos técnicos',
        };
      default:
        return {
          label: 'Pendente',
          color: 'bg-muted text-muted-foreground',
          icon: AlertTriangle,
          description: 'Avaliação em andamento',
        };
    }
  };

  const recConfig = getRecommendationConfig(interview.recommendation);
  const RecIcon = recConfig.icon;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}min ${secs}s`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const isV2 = interview.evaluationVersion === 'v2' || interview.evaluationVersion === 'new';
  const audit = interview.evaluationAuditTrail || {};
  const eliminators: string[] = Array.isArray(audit?.eliminators_fired) ? audit.eliminators_fired : [];
  const capsApplied: string[] = Array.isArray(audit?.caps_applied) ? audit.caps_applied : [];
  const seniorityTargetLabel = interview.seniorityTarget
    ? { junior: 'Júnior', pleno: 'Pleno', senior: 'Sênior', specialist: 'Specialist' }[interview.seniorityTarget]
    : null;

  return (
    <div className="space-y-6">
      {/* Evaluation version + seniority target */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className={isV2 ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' : 'bg-muted text-muted-foreground'}
        >
          Avaliação {isV2 ? 'V2 (adaptativa)' : interview.evaluationVersion || 'legacy'}
        </Badge>
        {seniorityTargetLabel && (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
            Senioridade-alvo: {seniorityTargetLabel}
          </Badge>
        )}
      </div>

      {/* Score and Recommendation */}
      <div className="grid grid-cols-2 gap-4">
        {/* Score Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Score Técnico</p>
              <p className={`text-4xl font-bold ${getScoreColor(interview.overallScore)}`}>
                {Math.round(interview.overallScore)}
              </p>
              <p className="text-sm text-muted-foreground">de 100</p>
              <Progress 
                value={interview.overallScore} 
                className="mt-3 h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Recommendation Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Recomendação</p>
              <div className="flex justify-center mb-2">
                <Badge variant="outline" className={`${recConfig.color} text-base px-3 py-1`}>
                  <RecIcon className="h-4 w-4 mr-1" />
                  {recConfig.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{recConfig.description}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>Duração: {formatDuration(interview.duration)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          <span>
            {formatBRT(interview.completedAt, "d 'de' MMM, yyyy 'às' HH:mm")}
          </span>
        </div>
      </div>

      {/* V2 Audit trail */}
      {(eliminators.length > 0 || capsApplied.length > 0) && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Decisões da avaliação V2
          </h4>
          {eliminators.length > 0 && (
            <div className="text-xs">
              <p className="text-muted-foreground mb-1">Eliminadores acionados:</p>
              <div className="flex flex-wrap gap-1">
                {eliminators.map((e, i) => (
                  <Badge key={i} variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                    {e}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {capsApplied.length > 0 && (
            <div className="text-xs">
              <p className="text-muted-foreground mb-1">Tetos aplicados:</p>
              <div className="flex flex-wrap gap-1">
                {capsApplied.map((c, i) => (
                  <Badge key={i} variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      {interview.evaluationSummary && (
        <div className="space-y-2">
          <h4 className="font-medium">Resumo da Avaliação</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {interview.evaluationSummary}
          </p>
        </div>
      )}

      {/* Strengths and Gaps */}
      <div className="grid grid-cols-2 gap-4">
        {/* Strengths */}
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            Pontos Fortes
          </h4>
          {interview.strengths.length > 0 ? (
            <ul className="space-y-1">
              {interview.strengths.map((strength, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-green-500">•</span>
                  <span className="text-muted-foreground">{strength}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum ponto forte identificado</p>
          )}
        </div>

        {/* Gaps */}
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            Gaps Identificados
          </h4>
          {interview.gaps.length > 0 ? (
            <ul className="space-y-1">
              {interview.gaps.map((gap, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  <span className="text-muted-foreground">{gap}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum gap identificado</p>
          )}
        </div>
      </div>

      {/* Job Context */}
      {interview.jobContext && (
        <div className="pt-4 border-t space-y-2">
          <h4 className="font-medium">Contexto da Vaga</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Skills Obrigatórias:</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {interview.jobContext.requiredSkills.slice(0, 5).map((skill, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">Skills Desejáveis:</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {interview.jobContext.desiredSkills.slice(0, 5).map((skill, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
