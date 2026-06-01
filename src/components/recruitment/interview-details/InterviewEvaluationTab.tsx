import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, ShieldCheck, ShieldAlert, Info } from 'lucide-react';
import { CriterionEvaluationCard } from './CriterionEvaluationCard';
import { useReprocessCultureEvaluation } from '@/hooks/useReprocessCultureEvaluation';
import { cn } from '@/lib/utils';
import type { EvaluationMeta } from '@/hooks/useInterviewDetails';

interface CriterionEvaluation {
  id: string;
  name: string;
  description: string;
  score: number;
  passed: boolean;
  weight: 'minor' | 'moderate' | 'important' | 'very_important' | 'critical';
  weightMultiplier: number;
  impactPercentage: number;
  minThreshold: number;
  assessment: string;
  questions: { number: number; question: string; answer?: string }[];
  evidenceCount?: number | null;
  redFlags?: string[] | null;
  confidenceLevel?: 'low' | 'medium' | 'high' | null;
  genericResponseDetected?: boolean;
}

interface InterviewEvaluationTabProps {
  interviewId: string;
  overallScore: number;
  evaluationStatus: 'approved' | 'rejected' | 'pending' | 'approved_with_caveats';
  criteria: CriterionEvaluation[];
  matchingAnalysis?: string | null;
  evaluationMeta?: EvaluationMeta;
}

const confidenceMeta: Record<string, { label: string; cls: string; Icon: any }> = {
  high:   { label: 'Confiança Alta',   cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', Icon: ShieldCheck },
  medium: { label: 'Confiança Média',  cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20', Icon: ShieldCheck },
  low:    { label: 'Confiança Baixa',  cls: 'bg-red-500/10 text-red-600 border-red-500/20', Icon: ShieldAlert },
};

export function InterviewEvaluationTab({
  interviewId,
  overallScore,
  evaluationStatus,
  criteria,
  matchingAnalysis,
  evaluationMeta,
}: InterviewEvaluationTabProps) {
  const reprocess = useReprocessCultureEvaluation();

  const analysisIndicatesFailure = !!matchingAnalysis && matchingAnalysis.includes("Avaliação automática falhou");
  const noRealEvaluation = criteria.length === 0 && (overallScore === 0 || overallScore == null);
  const evaluationFailed = analysisIndicatesFailure || noRealEvaluation;

  const getEvaluationBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      approved: { label: 'Recomendado', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
      approved_with_caveats: { label: 'Com ressalvas', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
      rejected: { label: 'Não recomendado', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
      pending: { label: 'Pendente', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
    };
    const variant = variants[status] || variants.pending;
    return <Badge variant="outline" className={variant.className}>{variant.label}</Badge>;
  };

  if (evaluationFailed) {
    return (
      <ScrollArea className="h-[400px] pr-4">
        <Alert className="border-yellow-500/40 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle>Avaliação não disponível</AlertTitle>
          <AlertDescription className="space-y-3">
            <p className="text-sm">
              A avaliação automática desta entrevista não foi gerada — provavelmente por
              uma instabilidade do modelo de IA no momento do processamento. Os dados
              brutos (áudio, transcrição e respostas) estão íntegros e podem ser
              reprocessados sem perda.
            </p>
            <Button size="sm" onClick={() => reprocess.mutate(interviewId)} disabled={reprocess.isPending}>
              <RefreshCw className={cn('h-4 w-4 mr-2', reprocess.isPending && 'animate-spin')} />
              {reprocess.isPending ? 'Reprocessando...' : 'Reprocessar avaliação'}
            </Button>
          </AlertDescription>
        </Alert>
      </ScrollArea>
    );
  }

  const meta = evaluationMeta;
  const audit = meta?.auditTrail as any;
  const v2AuditEntries: Array<{ rule: string; detail: string; outcome: string }> = audit?.v2?.audit_trail ?? [];
  const conf = meta?.avgConfidenceLevel ? confidenceMeta[meta.avgConfidenceLevel] : null;
  const scoreDelta = audit?.diff?.score_delta;
  const recommendationChanged = audit?.diff?.recommendation_changed;
  const versionUsed = audit?.version as 'v3' | 'v2' | 'legacy' | undefined;
  const strictness = audit?.strictness_profile as string | undefined;

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-6">
        {/* Overall Performance */}
        <div className="p-4 border rounded-lg bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold">Desempenho Geral</h3>
                {getEvaluationBadge(evaluationStatus)}
                {versionUsed && (
                  <Badge variant="outline" className={cn("text-[10px] uppercase", versionUsed === 'v3' && "bg-purple-50 text-purple-600 border-purple-100")}>
                    {versionUsed === 'v3' ? 'Avaliação V3 (Simulação)' : versionUsed === 'v2' ? 'Avaliação v2' : 'Legacy'}
                    {strictness ? ` · ${strictness}` : ''}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Média ponderada de todos os critérios de avaliação
              </p>
            </div>
            <div className="text-right">
              <span className={cn(
                "text-3xl font-bold",
                evaluationStatus === 'approved' ? "text-green-600" :
                evaluationStatus === 'approved_with_caveats' ? "text-amber-600" :
                evaluationStatus === 'rejected' ? "text-red-600" : "text-foreground"
              )}>
                {overallScore.toFixed(1)}
              </span>
              <span className="text-lg text-muted-foreground"> / 100</span>
            </div>
          </div>
          {matchingAnalysis && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Análise de Compatibilidade</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{matchingAnalysis}</p>
            </div>
          )}
        </div>

        {/* V2 Confidence + Shadow Comparison */}
        {meta && (meta.avgConfidenceLevel || meta.legacyScore != null || v2AuditEntries.length > 0) && (
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Confiança e Auditoria da Avaliação</h3>
            </div>

            <div className="flex flex-wrap gap-2">
              {conf && (
                <Badge variant="outline" className={cn('text-xs gap-1', conf.cls)}>
                  <conf.Icon className="h-3 w-3" />
                  {conf.label}
                </Badge>
              )}
              {meta.evidenceFloorPassed === false && (
                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700 border-amber-500/20 gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Piso de evidência insuficiente
                </Badge>
              )}
              {typeof meta.redFlagsCount === 'number' && meta.redFlagsCount > 0 && (
                <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/20 gap-1">
                  <ShieldAlert className="h-3 w-3" />
                  {meta.redFlagsCount} sinais de alerta
                </Badge>
              )}
            </div>

            {meta.legacyScore != null && (
              <div className="text-xs text-muted-foreground border-t pt-2">
                <span className="font-medium">Modo sombra:</span>{' '}
                Legacy = {meta.legacyScore.toFixed(1)}% ({meta.legacyRecommendation || '—'})
                {typeof scoreDelta === 'number' && (
                  <>
                    {' · '}
                    <span className={cn(scoreDelta > 0 ? 'text-emerald-600' : scoreDelta < 0 ? 'text-red-600' : '')}>
                      Δ {versionUsed === 'v3' ? 'V3' : 'V2'} {scoreDelta > 0 ? '+' : ''}{scoreDelta}pts
                    </span>
                  </>
                )}
                {recommendationChanged && (
                  <Badge variant="outline" className="ml-2 text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/20">
                    Recomendação mudou
                  </Badge>
                )}
              </div>
            )}

            {v2AuditEntries.length > 0 && (
              <div className="border-t pt-2 space-y-1">
                <p className="text-xs font-medium">Regras determinísticas aplicadas</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {v2AuditEntries.map((entry, i) => (
                    <li key={i} className="flex flex-col">
                      <span className="font-mono text-[11px] text-foreground">{entry.rule}</span>
                      <span>{entry.detail} → <span className="italic">{entry.outcome}</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Criteria List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Critérios de Avaliação da Entrevista</h3>
            <span className="text-sm text-muted-foreground">{criteria.length} critérios</span>
          </div>

          <div className="space-y-3">
            {criteria.map((criterion) => (
              <CriterionEvaluationCard key={criterion.id} criterion={criterion} />
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
