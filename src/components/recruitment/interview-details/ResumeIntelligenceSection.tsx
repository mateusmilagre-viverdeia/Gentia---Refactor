import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  CheckCircle2, 
  XCircle, 
  Lightbulb,
  TrendingUp,
  Search
} from "lucide-react";

interface ResumeIntelligenceSectionProps {
  technicalSessionId: string;
}

interface SkillsMatch {
  matched?: string[];
  missing?: string[];
  extra?: string[];
}

export function ResumeIntelligenceSection({ technicalSessionId }: ResumeIntelligenceSectionProps) {
  const { data: intelligence, isLoading } = useQuery({
    queryKey: ["resume-intelligence", technicalSessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("technical_interview_resume_intelligence")
        .select("*")
        .eq("session_id", technicalSessionId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!technicalSessionId,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-muted rounded w-1/3" />
        <div className="h-20 bg-muted rounded" />
      </div>
    );
  }

  if (!intelligence) return null;

  const skillsMatch = (intelligence.skills_match as SkillsMatch) || {};
  const matched = skillsMatch.matched || [];
  const missing = skillsMatch.missing || [];
  const extra = skillsMatch.extra || [];
  const predictiveScore = intelligence.predictive_score || 0;

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-green-600";
    if (score >= 50) return "text-amber-600";
    return "text-red-600";
  };

  const getProgressColor = (score: number) => {
    if (score >= 75) return "bg-green-500";
    if (score >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-primary" />
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Inteligência de Currículo
        </h4>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
          {intelligence.source}
        </Badge>
      </div>

      {/* Predictive Score Gauge */}
      <div className="bg-muted/20 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Score Preditivo</span>
          <span className={`text-2xl font-bold ${getScoreColor(Number(predictiveScore))}`}>
            {Number(predictiveScore).toFixed(0)}%
          </span>
        </div>
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={`absolute inset-y-0 left-0 rounded-full transition-all ${getProgressColor(Number(predictiveScore))}`}
            style={{ width: `${Math.min(Number(predictiveScore), 100)}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">
          Aderência estimada ao job description com base em dados públicos
        </p>
      </div>

      {/* Professional Summary */}
      {intelligence.professional_summary && (
        <div className="bg-muted/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium">Resumo Profissional</span>
            {intelligence.experience_years && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                ~{Number(intelligence.experience_years).toFixed(0)} anos exp.
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {intelligence.professional_summary}
          </p>
        </div>
      )}

      {/* Skills Match */}
      {(matched.length > 0 || missing.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {/* Matched Skills */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              <span className="text-xs font-medium text-green-700">Skills Encontradas</span>
              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-green-100 text-green-700">
                {matched.length}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1">
              {matched.map((skill, idx) => (
                <Badge key={idx} variant="secondary" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          {/* Missing Skills */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5 text-red-600" />
              <span className="text-xs font-medium text-red-700">Skills Não Encontradas</span>
              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-red-100 text-red-700">
                {missing.length}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1">
              {missing.map((skill, idx) => (
                <Badge key={idx} variant="secondary" className="text-[10px] bg-red-50 text-red-700 border-red-200">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Extra Skills */}
      {extra.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">Skills Adicionais</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {extra.map((skill, idx) => (
              <Badge key={idx} variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Exploration Points */}
      {intelligence.exploration_points && (intelligence.exploration_points as string[]).length > 0 && (
        <div className="bg-amber-50/50 border border-amber-200/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-xs font-medium text-amber-700">Pontos Explorados na Entrevista</span>
          </div>
          <ul className="space-y-1">
            {(intelligence.exploration_points as string[]).map((point, idx) => (
              <li key={idx} className="text-xs text-amber-800 flex items-start gap-1.5">
                <span className="text-amber-400 mt-0.5">•</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
