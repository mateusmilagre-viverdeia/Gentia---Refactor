import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Brain, MessageSquare, Lightbulb, Heart, Shield, Zap, Target } from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useState } from "react";

interface BehavioralInsightsSectionProps {
  sessionId: string;
}

interface BehavioralInsight {
  id: string;
  session_id: string;
  communication_score: number;
  structured_reasoning_score: number;
  emotional_intelligence_score: number;
  leadership_score: number;
  adaptability_score: number;
  results_orientation_score: number;
  overall_behavioral_score: number;
  disc_indicators: {
    d: number;
    i: number;
    s: number;
    c: number;
    primary_profile: string;
    reasoning: string;
  } | null;
  cultural_convergences: Array<{
    value_label: string;
    behavioral_dimension: string;
    evidence: string;
    impact: "positive" | "negative" | "neutral";
  }> | null;
  badges: string[];
  summary: string;
  dimension_details: {
    communication?: string;
    structured_reasoning?: string;
    emotional_intelligence?: string;
    leadership?: string;
    adaptability?: string;
    results_orientation?: string;
  };
}

const DIMENSION_CONFIG = [
  { key: "communication_score", label: "Comunicação", shortLabel: "Comunic.", icon: MessageSquare, color: "text-blue-600" },
  { key: "structured_reasoning_score", label: "Raciocínio Estruturado", shortLabel: "Raciocínio", icon: Lightbulb, color: "text-purple-600" },
  { key: "emotional_intelligence_score", label: "Inteligência Emocional", shortLabel: "Intel. Emoc.", icon: Heart, color: "text-pink-600" },
  { key: "leadership_score", label: "Liderança", shortLabel: "Liderança", icon: Shield, color: "text-amber-600" },
  { key: "adaptability_score", label: "Adaptabilidade", shortLabel: "Adaptab.", icon: Zap, color: "text-green-600" },
  { key: "results_orientation_score", label: "Orientação a Resultados", shortLabel: "Resultados", icon: Target, color: "text-red-600" },
] as const;

const DIMENSION_DETAIL_KEYS: Record<string, keyof BehavioralInsight["dimension_details"]> = {
  communication_score: "communication",
  structured_reasoning_score: "structured_reasoning",
  emotional_intelligence_score: "emotional_intelligence",
  leadership_score: "leadership",
  adaptability_score: "adaptability",
  results_orientation_score: "results_orientation",
};

export function BehavioralInsightsSection({ sessionId }: BehavioralInsightsSectionProps) {
  const [expandedDimension, setExpandedDimension] = useState<string | null>(null);

  const { data: insights, isLoading } = useQuery({
    queryKey: ["behavioral-insights", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("culture_interview_behavioral_insights")
        .select("*")
        .eq("session_id", sessionId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as BehavioralInsight | null;
    },
    enabled: !!sessionId,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-48 bg-muted rounded" />
        <div className="h-32 bg-muted rounded" />
      </div>
    );
  }

  if (!insights) return null;

  const radarData = DIMENSION_CONFIG.map(d => ({
    dimension: d.shortLabel,
    fullLabel: d.label,
    score: Number(insights[d.key]) || 0,
    fullMark: 100,
  }));

  const convergences = (insights.cultural_convergences || []) as BehavioralInsight["cultural_convergences"];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Insights Comportamentais
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Score geral:</span>
          <Badge variant={Number(insights.overall_behavioral_score) >= 70 ? "success" : Number(insights.overall_behavioral_score) >= 40 ? "warning" : "destructive"}>
            {Number(insights.overall_behavioral_score).toFixed(0)}%
          </Badge>
        </div>
      </div>

      {/* Badges */}
      {insights.badges && insights.badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {insights.badges.map((badge, i) => (
            <Badge key={i} variant="purple" className="text-xs">
              {badge}
            </Badge>
          ))}
        </div>
      )}

      {/* Summary */}
      {insights.summary && (
        <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-3">
          {insights.summary}
        </p>
      )}

      {/* Radar Chart */}
      <div className="bg-muted/20 rounded-lg p-3">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
              />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
              <Radar
                dataKey="score"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload?.[0]) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border rounded-lg p-2 shadow-lg text-xs">
                        <p className="font-medium">{data.fullLabel}</p>
                        <p className="text-primary">{data.score.toFixed(0)}%</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dimension Cards */}
      <div className="grid grid-cols-2 gap-2">
        {DIMENSION_CONFIG.map(dim => {
          const score = Number(insights[dim.key]) || 0;
          const Icon = dim.icon;
          const detailKey = DIMENSION_DETAIL_KEYS[dim.key];
          const detail = detailKey ? insights.dimension_details?.[detailKey] : null;
          const isExpanded = expandedDimension === dim.key;

          return (
            <div
              key={dim.key}
              className={`rounded-lg border p-2.5 cursor-pointer transition-all hover:shadow-sm ${
                isExpanded ? "col-span-2 bg-muted/30" : "bg-background"
              }`}
              onClick={() => setExpandedDimension(isExpanded ? null : dim.key)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-3.5 w-3.5 ${dim.color}`} />
                  <span className="text-xs font-medium">{dim.shortLabel}</span>
                </div>
                <span className={`text-xs font-bold ${
                  score >= 70 ? "text-green-600" : score >= 40 ? "text-amber-600" : "text-red-600"
                }`}>
                  {score.toFixed(0)}%
                </span>
              </div>
              {isExpanded && detail && (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {detail}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* DISC Pre-indicators */}
      {insights.disc_indicators && (
        <div className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Pré-indicadores DISC
            </span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              Preliminar
            </Badge>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(["d", "i", "s", "c"] as const).map(dim => {
              const score = insights.disc_indicators![dim];
              const labels = { d: "Dominância", i: "Influência", s: "Estabilidade", c: "Conformidade" };
              const colors = { d: "text-red-600", i: "text-amber-600", s: "text-green-600", c: "text-blue-600" };
              return (
                <div key={dim} className="text-center">
                  <span className={`text-lg font-bold ${colors[dim]}`}>{dim.toUpperCase()}</span>
                  <div className="text-xs font-medium">{score.toFixed(0)}%</div>
                  <div className="text-[10px] text-muted-foreground">{labels[dim]}</div>
                </div>
              );
            })}
          </div>
          {insights.disc_indicators.primary_profile && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Perfil primário: {insights.disc_indicators.primary_profile}</span>
              {insights.disc_indicators.reasoning && ` — ${insights.disc_indicators.reasoning}`}
            </p>
          )}
        </div>
      )}

      {/* Cultural Convergences */}
      {convergences && convergences.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Convergências Culturais
          </span>
          <div className="space-y-1.5">
            {convergences.map((conv, i) => (
              <div key={i} className="flex items-start gap-2 text-xs bg-muted/20 rounded-lg p-2">
                <span className={`mt-0.5 ${
                  conv.impact === "positive" ? "text-green-500" : conv.impact === "negative" ? "text-red-500" : "text-muted-foreground"
                }`}>
                  {conv.impact === "positive" ? "✓" : conv.impact === "negative" ? "✗" : "●"}
                </span>
                <div>
                  <span className="font-medium">{conv.value_label}</span>
                  <span className="text-muted-foreground"> → {conv.behavioral_dimension}</span>
                  <p className="text-muted-foreground mt-0.5">{conv.evidence}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
