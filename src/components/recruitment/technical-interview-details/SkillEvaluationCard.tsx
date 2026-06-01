import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle, XCircle, Star, ShieldAlert, Layers } from 'lucide-react';

interface SkillEvaluationCardProps {
  skill: string;
  skillType: 'required' | 'desired';
  score: number;
  level: 'basic' | 'intermediate' | 'advanced' | 'expert';
  justification: string;
  evidence?: string[];
  maxLevelReached?: number | null;
  maxLevelPassed?: number | null;
  ceilingDetected?: boolean | null;
  ceilingSignal?: string | null;
  seniorityAssessed?: 'junior' | 'pleno' | 'senior' | 'specialist' | null;
  evidenceCount?: number | null;
  scenarioHandled?: boolean | null;
  keywordCoverage?: number | null;
}

const LADDER_LABELS = ['Júnior', 'Pleno', 'Sênior', 'Specialist'];

export function SkillEvaluationCard({
  skill,
  skillType,
  score,
  level,
  justification,
  evidence,
  maxLevelReached,
  maxLevelPassed,
  ceilingDetected,
  ceilingSignal,
  seniorityAssessed,
  evidenceCount,
  scenarioHandled,
  keywordCoverage,
}: SkillEvaluationCardProps) {
  const getLevelConfig = (level: string) => {
    switch (level) {
      case 'expert':
        return { label: 'Expert', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: Star };
      case 'advanced':
        return { label: 'Avançado', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: CheckCircle2 };
      case 'intermediate':
        return { label: 'Intermediário', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', icon: AlertCircle };
      default:
        return { label: 'Básico', color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: XCircle };
    }
  };

  const levelConfig = getLevelConfig(level);
  const LevelIcon = levelConfig.icon;

  const getScoreColor = (s: number) => {
    if (s >= 70) return 'bg-green-500';
    if (s >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const seniorityLabel = seniorityAssessed
    ? { junior: 'Júnior', pleno: 'Pleno', senior: 'Sênior', specialist: 'Specialist' }[seniorityAssessed]
    : null;

  const showLadder = typeof maxLevelReached === 'number' && maxLevelReached > 0;

  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-medium">{skill}</h4>
          <Badge
            variant="outline"
            className={cn(
              'text-xs',
              skillType === 'required'
                ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {skillType === 'required' ? 'Obrigatória' : 'Desejável'}
          </Badge>
          {seniorityLabel && (
            <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-600 border-indigo-500/20">
              Nível: {seniorityLabel}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">{Math.round(score)}%</span>
          <Badge variant="outline" className={levelConfig.color}>
            <LevelIcon className="h-3 w-3 mr-1" />
            {levelConfig.label}
          </Badge>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative">
        <Progress value={score} className="h-2" />
        <div
          className={cn('absolute top-0 left-0 h-2 rounded-full transition-all', getScoreColor(score))}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Ladder visualization */}
      {showLadder && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Layers className="h-3 w-3" />
            <span>Sondagem em escada</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {LADDER_LABELS.map((lbl, i) => {
              const lvl = i + 1;
              const reached = lvl <= (maxLevelReached || 0);
              const passed = lvl <= (maxLevelPassed || 0);
              return (
                <div
                  key={lbl}
                  className={cn(
                    'text-[10px] uppercase tracking-wide text-center py-1 rounded border',
                    passed
                      ? 'bg-green-500/10 text-green-700 border-green-500/30 font-medium'
                      : reached
                      ? 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30'
                      : 'bg-muted/40 text-muted-foreground border-border/50'
                  )}
                  title={passed ? 'Passou neste degrau' : reached ? 'Sondado, não passou' : 'Não sondado'}
                >
                  D{lvl} · {lbl}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ceiling signal */}
      {ceilingDetected && (
        <div className="flex items-start gap-2 text-xs bg-amber-500/10 text-amber-700 border border-amber-500/20 rounded px-2 py-1.5">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <div>
            <span className="font-medium">Teto técnico detectado</span>
            {ceilingSignal && <span className="text-muted-foreground"> · {ceilingSignal}</span>}
          </div>
        </div>
      )}

      {/* Evidence metrics */}
      {(typeof evidenceCount === 'number' || typeof keywordCoverage === 'number' || scenarioHandled !== null) && (
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1">
          {typeof evidenceCount === 'number' && (
            <span>Evidências práticas: <strong className="text-foreground">{evidenceCount}</strong></span>
          )}
          {typeof keywordCoverage === 'number' && (
            <span>Cobertura de keywords: <strong className="text-foreground">{Math.round(keywordCoverage * 100)}%</strong></span>
          )}
          {scenarioHandled !== null && scenarioHandled !== undefined && (
            <span>Cenário/trade-off: <strong className="text-foreground">{scenarioHandled ? 'sim' : 'não'}</strong></span>
          )}
        </div>
      )}

      {/* Justification */}
      {justification && <p className="text-sm text-muted-foreground">{justification}</p>}

      {/* Evidence */}
      {evidence && evidence.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-1">Evidências citadas:</p>
          <ul className="text-sm space-y-1">
            {evidence.slice(0, 3).map((e, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="text-primary">•</span>
                <span className="text-muted-foreground line-clamp-2">{e}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
