import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, Target, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { DISC_DIMENSIONS, type DISCDimension } from "@/types/disc.types";

interface DISCResultData {
  d_normalized: number;
  i_normalized: number;
  s_normalized: number;
  c_normalized: number;
  primary_profile: string;
  secondary_profile: string | null;
  intensity: string;
  match_score: number | null;
  is_balanced: boolean;
}

interface DISCProfileTarget {
  use_advanced_mode: boolean | null;
  target_d: number | null;
  target_i: number | null;
  target_s: number | null;
  target_c: number | null;
  tolerance: number | null;
  eliminator_d: number | null;
  eliminator_i: number | null;
  eliminator_s: number | null;
  eliminator_c: number | null;
  min_match_score: number;
}

interface DISCResultSectionProps {
  result: DISCResultData;
  profile?: DISCProfileTarget | null;
  completedAt?: string;
}

const DIMENSION_COLORS: Record<string, string> = {
  D: "#ef4444",
  I: "#eab308",
  S: "#22c55e",
  C: "#3b82f6",
};

export function DISCResultSection({ result, profile, completedAt }: DISCResultSectionProps) {
  const scores = {
    D: result.d_normalized,
    I: result.i_normalized,
    S: result.s_normalized,
    C: result.c_normalized,
  };

  const radarData = (["D", "I", "S", "C"] as DISCDimension[]).map((dim) => ({
    dimension: DISC_DIMENSIONS[dim].name,
    candidato: scores[dim],
    alvo: profile?.use_advanced_mode
      ? (profile[`target_${dim.toLowerCase()}` as keyof DISCProfileTarget] as number | null) ?? 0
      : 0,
    fullMark: 100,
  }));

  const hasTargets = profile?.use_advanced_mode && radarData.some((d) => d.alvo > 0);

  // Check eliminators
  const eliminatorIssues: { dim: DISCDimension; score: number; min: number }[] = [];
  if (profile?.use_advanced_mode) {
    for (const dim of ["D", "I", "S", "C"] as DISCDimension[]) {
      const elimKey = `eliminator_${dim.toLowerCase()}` as keyof DISCProfileTarget;
      const elim = profile[elimKey] as number | null;
      if (elim != null && scores[dim] < elim) {
        eliminatorIssues.push({ dim, score: scores[dim], min: elim });
      }
    }
  }

  const matchScore = result.match_score ?? 0;
  const primaryDim = result.primary_profile as DISCDimension;
  const secondaryDim = result.secondary_profile as DISCDimension | null;

  const getIntensityLabel = (intensity: string) => {
    const map: Record<string, string> = { baixa: "Baixa", média: "Média", alta: "Alta" };
    return map[intensity] || intensity;
  };

  return (
    <div className="space-y-4">
      {/* Header with profile badges */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Perfil Comportamental (DISC)
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            className="text-xs font-bold px-2"
            style={{
              backgroundColor: `${DIMENSION_COLORS[primaryDim]}20`,
              color: DIMENSION_COLORS[primaryDim],
              borderColor: `${DIMENSION_COLORS[primaryDim]}40`,
            }}
          >
            {DISC_DIMENSIONS[primaryDim]?.name || primaryDim}
          </Badge>
          {secondaryDim && DISC_DIMENSIONS[secondaryDim] && (
            <Badge variant="outline" className="text-xs">
              {DISC_DIMENSIONS[secondaryDim].name}
            </Badge>
          )}
          <Badge variant="secondary" className="text-[10px]">
            {getIntensityLabel(result.intensity)}
          </Badge>
        </div>
      </div>

      {/* Eliminator warnings */}
      {eliminatorIssues.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-2 text-destructive text-sm font-medium">
            <AlertTriangle className="h-4 w-4" />
            Eliminador atingido
          </div>
          {eliminatorIssues.map((issue) => (
            <p key={issue.dim} className="text-xs text-destructive/80 pl-6">
              {DISC_DIMENSIONS[issue.dim].name}: {issue.score.toFixed(0)}% (mínimo obrigatório: {issue.min}%)
            </p>
          ))}
        </div>
      )}

      {/* Match Score */}
      {result.match_score != null && (
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Match Score</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${matchScore >= 70 ? "text-green-600" : matchScore >= 40 ? "text-amber-600" : "text-red-600"}`}>
                {matchScore.toFixed(0)}%
              </span>
              {eliminatorIssues.length === 0 && matchScore >= (profile?.min_match_score ?? 70) && (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              )}
            </div>
          </div>
          <Progress value={matchScore} className="h-2" />
          {profile?.min_match_score != null && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Nota de corte: {profile.min_match_score}%
            </p>
          )}
        </div>
      )}

      {/* Radar Chart */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-muted/20 rounded-lg p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Perfil DISC</p>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                {hasTargets && (
                  <Radar
                    dataKey="alvo"
                    stroke="#f59e0b"
                    fill="transparent"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    strokeOpacity={0.7}
                  />
                )}
                <Radar
                  dataKey="candidato"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-2 shadow-lg text-xs">
                          <p className="font-medium mb-1">{data.dimension}</p>
                          <p className="text-primary">Candidato: {data.candidato.toFixed(0)}%</p>
                          {hasTargets && data.alvo > 0 && (
                            <p className="text-amber-600">Alvo: {data.alvo.toFixed(0)}%</p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          {hasTargets && (
            <div className="flex items-center justify-center gap-4 mt-1">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-[10px] text-muted-foreground">Candidato</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-4 border-t-2 border-amber-500 border-dashed" />
                <span className="text-[10px] text-muted-foreground">Alvo</span>
              </div>
            </div>
          )}
        </div>

        {/* Dimension Breakdown */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Scores por Dimensão</p>
          {(["D", "I", "S", "C"] as DISCDimension[]).map((dim) => {
            const dimInfo = DISC_DIMENSIONS[dim];
            const value = scores[dim];
            const targetKey = `target_${dim.toLowerCase()}` as keyof DISCProfileTarget;
            const target = profile?.use_advanced_mode ? (profile[targetKey] as number | null) : null;
            const elimKey = `eliminator_${dim.toLowerCase()}` as keyof DISCProfileTarget;
            const elim = profile?.use_advanced_mode ? (profile[elimKey] as number | null) : null;
            const isEliminated = elim != null && value < elim;

            return (
              <div key={dim} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: DIMENSION_COLORS[dim] }}
                    />
                    <span className="font-medium">{dimInfo.name}</span>
                    {isEliminated && (
                      <AlertTriangle className="h-3 w-3 text-destructive" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{value.toFixed(0)}%</span>
                    {target != null && (
                      <span className="text-muted-foreground text-[10px]">
                        (alvo: {target}%)
                      </span>
                    )}
                  </div>
                </div>
                <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all"
                    style={{
                      width: `${Math.min(value, 100)}%`,
                      backgroundColor: isEliminated ? "hsl(var(--destructive))" : DIMENSION_COLORS[dim],
                    }}
                  />
                  {target != null && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-amber-500"
                      style={{ left: `${Math.min(target, 100)}%` }}
                    />
                  )}
                </div>
              </div>
            );
          })}

          {result.is_balanced && (
            <Badge variant="secondary" className="text-[10px] mt-2">
              Perfil equilibrado
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
