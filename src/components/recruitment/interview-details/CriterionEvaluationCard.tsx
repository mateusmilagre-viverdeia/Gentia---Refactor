import { useState } from 'react';
import { ChevronDown, ChevronUp, ShieldAlert, Quote, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface QuestionEvaluation {
  number: number;
  question: string;
  answer?: string;
  evidenceQuotes?: string[];
}

interface CriterionEvaluationCardProps {
  criterion: {
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
    questions: QuestionEvaluation[];
    evidenceCount?: number | null;
    redFlags?: string[] | null;
    confidenceLevel?: 'low' | 'medium' | 'high' | null;
    genericResponseDetected?: boolean;
  };
}

const weightLabels: Record<string, string> = {
  minor: 'Menor',
  moderate: 'Moderado',
  important: 'Importante',
  very_important: 'Muito Importante',
  critical: 'Crítico',
};

const confidenceMeta: Record<string, { label: string; cls: string }> = {
  high:   { label: 'Confiança Alta',   cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  medium: { label: 'Confiança Média',  cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  low:    { label: 'Confiança Baixa',  cls: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 65) return 'text-amber-600';
  return 'text-red-600';
}

export function CriterionEvaluationCard({ criterion }: CriterionEvaluationCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<number[]>([]);

  const toggleQuestion = (n: number) => {
    setExpandedQuestions(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]);
  };

  const redFlags = criterion.redFlags ?? [];
  const conf = criterion.confidenceLevel ? confidenceMeta[criterion.confidenceLevel] : null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="text-left">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  {criterion.name}
                  {redFlags.length > 0 && (
                    <ShieldAlert className="h-3.5 w-3.5 text-red-600" aria-label="Sinais de alerta" />
                  )}
                </h4>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn("text-lg font-bold", scoreColor(criterion.score))}>
                {criterion.score.toFixed(1)} / 100
              </span>
              <Badge
                variant="outline"
                className={cn(
                  criterion.passed
                    ? "bg-green-500/10 text-green-600 border-green-500/20"
                    : "bg-red-500/10 text-red-600 border-red-500/20"
                )}
              >
                {criterion.passed ? 'Passou' : 'Reprovado'}
              </Badge>
              {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4 border-t">
            <p className="text-sm text-muted-foreground pt-4">{criterion.description}</p>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs">
                Peso: {weightLabels[criterion.weight]} (x{criterion.weightMultiplier})
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Impacto: {criterion.impactPercentage.toFixed(1)}% do score
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Mín. limite: {criterion.minThreshold.toFixed(1)}
              </Badge>
              {typeof criterion.evidenceCount === 'number' && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Quote className="h-3 w-3" />
                  {criterion.evidenceCount} {criterion.evidenceCount === 1 ? 'evidência' : 'evidências'}
                </Badge>
              )}
              {conf && (
                <Badge variant="outline" className={cn('text-xs', conf.cls)}>
                  {conf.label}
                </Badge>
              )}
              {criterion.genericResponseDetected && (
                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700 border-amber-500/20 gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Resposta genérica detectada
                </Badge>
              )}
            </div>

            {redFlags.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-red-600 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" /> Sinais de alerta detectados
                </h5>
                <ul className="space-y-1 list-disc list-inside text-sm text-red-600/90 bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                  {redFlags.map((rf, i) => <li key={i}>{rf}</li>)}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <h5 className="text-sm font-medium">Avaliação</h5>
              <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                {criterion.assessment}
              </p>
            </div>

            {criterion.questions.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium">
                  Questões usadas para avaliar ({criterion.questions.length})
                </h5>
                <div className="space-y-2">
                  {criterion.questions.map((question) => {
                    const quotes = question.evidenceQuotes || [];
                    const answerLower = (question.answer || '').toLowerCase();
                    
                    // Improved quote matching: ignore punctuation and extra whitespace
                    const normalizeForMatch = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '').slice(0, 30);
                    const answerHasQuote = quotes.length === 0 || quotes.some(q => {
                      const normalizedQuote = normalizeForMatch(q);
                      return normalizedQuote.length > 5 && normalizeForMatch(question.answer || '').includes(normalizedQuote);
                    });
                    
                    const hasDetail = !!question.answer || quotes.length > 0;
                    return (
                    <Collapsible
                      key={question.number}
                      open={expandedQuestions.includes(question.number)}
                      onOpenChange={() => toggleQuestion(question.number)}
                    >
                      <CollapsibleTrigger asChild>
                        <button className="w-full p-3 bg-muted/30 rounded-lg flex items-start justify-between text-left hover:bg-muted/50 transition-colors">
                          <div className="flex gap-2">
                            <span className="text-xs font-mono text-muted-foreground">Q{question.number}</span>
                            <span className="text-sm">{question.question}</span>
                          </div>
                          {hasDetail && (
                            expandedQuestions.includes(question.number)
                              ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}
                        </button>
                      </CollapsibleTrigger>
                      {hasDetail && (
                        <CollapsibleContent>
                          <div className="ml-6 mt-2 space-y-2">
                            {quotes.length > 0 && (
                              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <Quote className="h-3 w-3 text-primary" />
                                  <span className="text-xs font-medium text-primary">
                                    {quotes.length === 1 ? 'Trecho citado pela IA' : 'Trechos citados pela IA'}
                                  </span>
                                </div>
                                <ul className="space-y-1">
                                  {quotes.map((q, i) => (
                                    <li key={i} className="text-sm text-foreground/90 italic">"{q}"</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {question.answer && (
                              <div className="p-3 bg-background border rounded-lg">
                                {!answerHasQuote && (
                                  <div className="flex items-start gap-1.5 mb-1.5 text-xs text-amber-700 bg-amber-500/5 border border-amber-500/20 rounded p-1.5">
                                    <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                    <span>Transcrição contínua — pode incluir trechos de outra pergunta.</span>
                                  </div>
                                )}
                                <p className="text-xs font-medium text-muted-foreground mb-1">Resposta capturada</p>
                                <p className="text-sm text-muted-foreground">{question.answer}</p>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      )}
                    </Collapsible>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
