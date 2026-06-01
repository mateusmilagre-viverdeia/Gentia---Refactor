
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useDISCInterviewDetails } from '@/hooks/useDISCInterviewDetails';
import { DISC_DIMENSIONS, type DISCDimension } from '@/types/disc.types';
import { Brain, TrendingUp, Scale, Target, Clock } from 'lucide-react';
import { formatBRT } from "@/lib/datetime";

interface DISCInterviewResultSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
}

const DIMENSION_COLORS: Record<string, string> = {
  D: 'bg-red-500',
  I: 'bg-yellow-500',
  S: 'bg-green-500',
  C: 'bg-blue-500',
};

export function DISCInterviewResultSheet({
  open,
  onOpenChange,
  sessionId,
}: DISCInterviewResultSheetProps) {
  const { data: interview, isLoading, error } = useDISCInterviewDetails(sessionId);

  const formatSubtitle = () => {
    if (!interview) return '';
    const date = interview.completedAt
      ? formatBRT(interview.completedAt, "d 'de' MMM")
      : formatBRT(interview.createdAt, "d 'de' MMM");
    return `${interview.candidateName} • ${interview.jobTitle} • ${date}`;
  };

  const hasResult = interview?.hasResult ?? false;
  const primaryProfile = interview?.primaryProfile;

  const scores = (hasResult && interview)
    ? [
        { key: 'D', label: DISC_DIMENSIONS.D.name, value: interview.dNormalized ?? 0, raw: interview.dScore ?? 0 },
        { key: 'I', label: DISC_DIMENSIONS.I.name, value: interview.iNormalized ?? 0, raw: interview.iScore ?? 0 },
        { key: 'S', label: DISC_DIMENSIONS.S.name, value: interview.sNormalized ?? 0, raw: interview.sScore ?? 0 },
        { key: 'C', label: DISC_DIMENSIONS.C.name, value: interview.cNormalized ?? 0, raw: interview.cScore ?? 0 },
      ]
    : [];

  const intensityLabel = interview?.intensity === 'alta'
    ? 'Alta' : interview?.intensity === 'média'
    ? 'Média' : interview?.intensity === 'baixa'
    ? 'Baixa' : null;

  const intensityColor = interview?.intensity === 'alta'
    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    : interview?.intensity === 'média'
    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    : 'bg-muted text-muted-foreground';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error || !interview ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">
              {error ? 'Erro ao carregar detalhes' : 'Avaliação não encontrada'}
            </p>
          </div>
        ) : !hasResult ? (
          /* Session exists but no result yet */
          <>
            <SheetHeader className="space-y-1 pr-6">
              <SheetTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Fit Comportamental (DISC)
              </SheetTitle>
              <p className="text-sm text-muted-foreground">{formatSubtitle()}</p>
            </SheetHeader>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-lg border p-8 text-center">
              <Clock className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Aguardando processamento</p>
              <p className="text-sm text-muted-foreground">
                {interview.status === 'completed'
                  ? 'A avaliação foi concluída e o resultado está sendo processado.'
                  : 'A avaliação ainda não foi concluída pelo candidato.'}
              </p>
            </div>
            {/* Dates */}
            <div className="mt-6 rounded-lg border p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Criada em</span>
                <span>{formatBRT(interview.createdAt, "dd/MM/yyyy 'às' HH:mm")}</span>
              </div>
              {interview.startedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Iniciada em</span>
                  <span>{formatBRT(interview.startedAt, "dd/MM/yyyy 'às' HH:mm")}</span>
                </div>
              )}
              {interview.completedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Concluída em</span>
                  <span>{formatBRT(interview.completedAt, "dd/MM/yyyy 'às' HH:mm")}</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <SheetHeader className="space-y-1 pr-6">
              <SheetTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Fit Comportamental (DISC)
              </SheetTitle>
              <p className="text-sm text-muted-foreground">{formatSubtitle()}</p>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Match Score */}
              {interview.matchScore !== null && (
                <div className="rounded-lg border p-4 flex items-center gap-4">
                  <div className="flex items-center justify-center h-14 w-14 rounded-full bg-primary/10">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Match Score</p>
                    <p className="text-2xl font-bold">{interview.matchScore}%</p>
                  </div>
                </div>
              )}

              {/* Profile Summary */}
              {primaryProfile && (
                <div className="rounded-lg border p-4 space-y-3">
                  <h3 className="font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    Perfil Identificado
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={`${DIMENSION_COLORS[primaryProfile]} text-white`}>
                      {DISC_DIMENSIONS[primaryProfile].name} (Primário)
                    </Badge>
                    {interview.secondaryProfile && (
                      <Badge variant="outline" className="border-muted-foreground/30">
                        {DISC_DIMENSIONS[interview.secondaryProfile].name} (Secundário)
                      </Badge>
                    )}
                    {intensityLabel && (
                      <Badge className={intensityColor} variant="secondary">
                        Intensidade {intensityLabel}
                      </Badge>
                    )}
                    {interview.isBalanced && (
                      <Badge variant="secondary" className="gap-1">
                        <Scale className="h-3 w-3" />
                        Equilibrado
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {DISC_DIMENSIONS[primaryProfile].description}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {DISC_DIMENSIONS[primaryProfile].traits.map((trait) => (
                      <Badge key={trait} variant="outline" className="text-xs">
                        {trait}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Score Bars */}
              <div className="rounded-lg border p-4 space-y-4">
                <h3 className="font-medium">Scores por Dimensão</h3>
                {scores.map((dim) => (
                  <div key={dim.key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{dim.key} — {dim.label}</span>
                      <span className="text-muted-foreground">
                        {dim.value}% <span className="text-xs">(raw: {dim.raw})</span>
                      </span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${DIMENSION_COLORS[dim.key]}`}
                        style={{ width: `${dim.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Dates */}
              <div className="rounded-lg border p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Criada em</span>
                  <span>{formatBRT(interview.createdAt, "dd/MM/yyyy 'às' HH:mm")}</span>
                </div>
                {interview.startedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Iniciada em</span>
                    <span>{formatBRT(interview.startedAt, "dd/MM/yyyy 'às' HH:mm")}</span>
                  </div>
                )}
                {interview.completedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Concluída em</span>
                    <span>{formatBRT(interview.completedAt, "dd/MM/yyyy 'às' HH:mm")}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
