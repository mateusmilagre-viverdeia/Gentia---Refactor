import { TechnicalSkillRadarChart } from './TechnicalSkillRadarChart';
import { SkillEvaluationCard } from './SkillEvaluationCard';
import type { TechnicalInterviewDetails, TechnicalSkillEvaluation } from '@/hooks/useTechnicalInterviewDetails';

interface TechnicalSkillsTabProps {
  interview: TechnicalInterviewDetails;
}

export function TechnicalSkillsTab({ interview }: TechnicalSkillsTabProps) {
  // Build skill evaluations from skillScores if responses are empty
  const skillEvaluations: TechnicalSkillEvaluation[] = interview.responses.length > 0 
    ? interview.responses 
    : Object.entries(interview.skillScores).map(([skill, score]) => ({
        skill,
        skillType: interview.jobContext?.requiredSkills.includes(skill) ? 'required' as const : 'desired' as const,
        score,
        level: getLevelFromScore(score),
        justification: '',
        evidence: [],
      }));

  function getLevelFromScore(score: number): 'basic' | 'intermediate' | 'advanced' | 'expert' {
    if (score >= 90) return 'expert';
    if (score >= 70) return 'advanced';
    if (score >= 40) return 'intermediate';
    return 'basic';
  }

  // Sort: required first, then by score descending
  const sortedEvaluations = [...skillEvaluations].sort((a, b) => {
    if (a.skillType === 'required' && b.skillType !== 'required') return -1;
    if (a.skillType !== 'required' && b.skillType === 'required') return 1;
    return b.score - a.score;
  });

  return (
    <div className="space-y-6">
      {/* Radar Chart */}
      {Object.keys(interview.skillScores).length > 0 && (
        <div className="bg-muted/30 rounded-lg p-4">
          <h4 className="font-medium mb-4 text-center">Mapa de Competências</h4>
          <TechnicalSkillRadarChart 
            skillScores={interview.skillScores} 
            skillLevels={interview.skillLevels}
          />
        </div>
      )}

      {/* Skill Cards */}
      <div className="space-y-3">
        <h4 className="font-medium">Avaliação por Competência</h4>
        {sortedEvaluations.length > 0 ? (
          sortedEvaluations.map((evaluation, index) => (
            <SkillEvaluationCard
              key={`${evaluation.skill}-${index}`}
              skill={evaluation.skill}
              skillType={evaluation.skillType}
              score={evaluation.score}
              level={evaluation.level}
              justification={evaluation.justification}
              evidence={evaluation.evidence}
              maxLevelReached={evaluation.maxLevelReached}
              maxLevelPassed={evaluation.maxLevelPassed}
              ceilingDetected={evaluation.ceilingDetected}
              ceilingSignal={evaluation.ceilingSignal}
              seniorityAssessed={evaluation.seniorityAssessed}
              evidenceCount={evaluation.evidenceCount}
              scenarioHandled={evaluation.scenarioHandled}
              keywordCoverage={evaluation.keywordCoverage}
            />
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma competência avaliada
          </p>
        )}
      </div>
    </div>
  );
}
