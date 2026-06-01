import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  CheckCircle2,
  AlertCircle,
  MapPin,
  Briefcase,
  Star,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { HuntingResult } from '@/hooks/useHuntingSearch';

interface HuntingCandidateDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: HuntingResult | null;
}

interface SkillEvaluation {
  skill: string;
  has_skill: boolean;
  evidence: string;
}

interface LocationEvaluation {
  job_location: string;
  candidate_location: string;
  score: number;
  reasoning: string;
}

interface ScoreBreakdownV2 {
  required_skills_evaluation?: SkillEvaluation[];
  desired_skills_evaluation?: SkillEvaluation[];
  location_evaluation?: LocationEvaluation;
  required_score?: number;
  desired_score?: number;
  location_score?: number;
  // Legacy fields
  mandatory_skills_match?: number;
  nice_to_have_match?: number;
  experience_fit?: number;
  culture_fit?: number;
  details?: {
    matched_mandatory?: string[];
    missed_mandatory?: string[];
    matched_nice_to_have?: string[];
    deal_breaker_flags?: string[];
    location_score?: number;
  };
}

function getScoreColor(score: number): string {
  if (score >= 75) return 'text-green-600';
  if (score >= 50) return 'text-yellow-600';
  return 'text-red-500';
}

function getScoreBg(score: number): string {
  if (score >= 75) return 'bg-green-500';
  if (score >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

function SkillRow({ eval: e }: { eval: SkillEvaluation }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      {e.has_skill ? (
        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium">{e.skill}</span>
        {e.evidence && (
          <p className="text-xs text-muted-foreground mt-0.5">{e.evidence}</p>
        )}
      </div>
    </div>
  );
}

export function HuntingCandidateDetail({ open, onOpenChange, result }: HuntingCandidateDetailProps) {
  if (!result) return null;

  const data = result.extracted_data || {};
  const name = data.name || data.title?.split(' at ')[0] || 'Candidato';
  const breakdown: ScoreBreakdownV2 = (result as any).score_breakdown || data.score_breakdown || {};

  // Detect if it's the new v2 format
  const isV2 = !!breakdown.required_skills_evaluation;

  const requiredScore = breakdown.required_score ?? breakdown.mandatory_skills_match ?? 0;
  const desiredScore = breakdown.desired_score ?? breakdown.nice_to_have_match ?? 0;
  const locationScore = breakdown.location_score ?? breakdown.details?.location_score ?? 0;

  const confirmedRequired = isV2
    ? (breakdown.required_skills_evaluation || []).filter(e => e.has_skill)
    : (breakdown.details?.matched_mandatory || []).map(s => ({ skill: s, has_skill: true, evidence: '' }));
  const unconfirmedRequired = isV2
    ? (breakdown.required_skills_evaluation || []).filter(e => !e.has_skill)
    : (breakdown.details?.missed_mandatory || []).map(s => ({ skill: s, has_skill: false, evidence: '' }));

  const confirmedDesired = isV2
    ? (breakdown.desired_skills_evaluation || []).filter(e => e.has_skill)
    : (breakdown.details?.matched_nice_to_have || []).map(s => ({ skill: s, has_skill: true, evidence: '' }));
  const unconfirmedDesired = isV2
    ? (breakdown.desired_skills_evaluation || []).filter(e => !e.has_skill)
    : [];

  const locationEval = breakdown.location_evaluation;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Avaliação do Candidato
          </SheetTitle>
        </SheetHeader>

        {/* Candidate header */}
        <div className="mb-6 space-y-2">
          <h3 className="font-semibold text-lg">{name}</h3>
          {(data.title || data.company) && (
            <p className="text-sm text-muted-foreground">
              {data.title}{data.company && ` @ ${data.company}`}
            </p>
          )}
          {data.location && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {data.location}
            </p>
          )}
          {result.source_url && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => window.open(result.source_url!, '_blank')}
            >
              <ExternalLink className="h-3 w-3" />
              Ver perfil original
            </Button>
          )}
        </div>

        {/* Overall score */}
        <div className="mb-6 p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Match Score Geral</span>
            <span className={`text-2xl font-bold ${getScoreColor(result.match_score || 0)}`}>
              {result.match_score ?? '-'}%
            </span>
          </div>
          <Progress value={result.match_score || 0} className="h-2" />
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="text-center">
              <div className={`text-lg font-semibold ${getScoreColor(requiredScore)}`}>{requiredScore}%</div>
              <div className="text-xs text-muted-foreground">Obrigatórios</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-semibold ${getScoreColor(desiredScore)}`}>{desiredScore}%</div>
              <div className="text-xs text-muted-foreground">Desejáveis</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-semibold ${getScoreColor(locationScore)}`}>{locationScore}%</div>
              <div className="text-xs text-muted-foreground">Localização</div>
            </div>
          </div>
        </div>

        {/* Detailed breakdown */}
        <Accordion type="multiple" defaultValue={['required', 'desired', 'location']} className="space-y-2">
          {/* Required Skills */}
          <AccordionItem value="required" className="border rounded-lg px-3">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                <span className="font-medium">Requisitos Obrigatórios</span>
                <Badge variant="outline" className="ml-1 text-xs">50%</Badge>
                <Badge className={`ml-auto text-xs ${requiredScore >= 70 ? 'bg-green-500' : requiredScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                  {requiredScore}%
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {confirmedRequired.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-green-600 mb-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> A IA conseguiu confirmar esses itens:
                  </p>
                  <div className="ml-1 divide-y divide-border/50">
                    {confirmedRequired.map((e: any, i: number) => (
                      <SkillRow key={i} eval={typeof e === 'string' ? { skill: e, has_skill: true, evidence: '' } : e} />
                    ))}
                  </div>
                </div>
              )}
              {unconfirmedRequired.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-amber-600 mb-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> A IA indica você validar:
                  </p>
                  <div className="ml-1 divide-y divide-border/50">
                    {unconfirmedRequired.map((e: any, i: number) => (
                      <SkillRow key={i} eval={typeof e === 'string' ? { skill: e, has_skill: false, evidence: '' } : e} />
                    ))}
                  </div>
                </div>
              )}
              {confirmedRequired.length === 0 && unconfirmedRequired.length === 0 && (
                <p className="text-xs text-muted-foreground">Sem dados de avaliação detalhada disponíveis.</p>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Desired Skills */}
          <AccordionItem value="desired" className="border rounded-lg px-3">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Requisitos Desejáveis</span>
                <Badge variant="outline" className="ml-1 text-xs">30%</Badge>
                <Badge className={`ml-auto text-xs ${desiredScore >= 70 ? 'bg-green-500' : desiredScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                  {desiredScore}%
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {confirmedDesired.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-green-600 mb-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> A IA conseguiu confirmar esses itens:
                  </p>
                  <div className="ml-1 divide-y divide-border/50">
                    {confirmedDesired.map((e: any, i: number) => (
                      <SkillRow key={i} eval={typeof e === 'string' ? { skill: e, has_skill: true, evidence: '' } : e} />
                    ))}
                  </div>
                </div>
              )}
              {unconfirmedDesired.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-amber-600 mb-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> A IA indica você validar:
                  </p>
                  <div className="ml-1 divide-y divide-border/50">
                    {unconfirmedDesired.map((e: any, i: number) => (
                      <SkillRow key={i} eval={typeof e === 'string' ? { skill: e, has_skill: false, evidence: '' } : e} />
                    ))}
                  </div>
                </div>
              )}
              {confirmedDesired.length === 0 && unconfirmedDesired.length === 0 && (
                <p className="text-xs text-muted-foreground">Sem dados de avaliação detalhada disponíveis.</p>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Location */}
          <AccordionItem value="location" className="border rounded-lg px-3">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Localização</span>
                <Badge variant="outline" className="ml-1 text-xs">20%</Badge>
                <Badge className={`ml-auto text-xs ${locationScore >= 70 ? 'bg-green-500' : locationScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                  {locationScore}%
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {locationEval ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Localização da vaga</p>
                      <p className="font-medium">{locationEval.job_location || 'Não especificada'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Localização do candidato</p>
                      <p className="font-medium">{locationEval.candidate_location || 'Não detectada'}</p>
                    </div>
                  </div>
                  {locationEval.reasoning && (
                    <p className="text-xs text-muted-foreground italic">💡 {locationEval.reasoning}</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Localização da vaga</p>
                    <p className="font-medium">—</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Localização do candidato</p>
                    <p className="font-medium">{data.location || 'Não detectada'}</p>
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Match reasoning */}
        {result.match_reasoning && (
          <div className="mt-4 p-3 rounded-lg bg-muted/30 border">
            <p className="text-xs font-medium mb-1">Resumo da IA</p>
            <p className="text-sm text-muted-foreground">{result.match_reasoning}</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
