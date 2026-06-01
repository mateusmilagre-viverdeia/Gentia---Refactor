import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, MapPin, Briefcase, CheckCircle2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { TranscriptDialog } from "./TranscriptDialog";

interface ShortlistCandidateCardProps {
  candidate: any;
  existingFeedback: any;
  onApprove: () => void;
  onReject: () => void;
  jobId: string;
}

function ScoreCircle({ score, label }: { score: number | null; label?: string }) {
  if (score == null) return null;
  const color = score >= 7 ? "text-green-600 border-green-600" : score >= 5 ? "text-yellow-600 border-yellow-600" : "text-red-600 border-red-600";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn("w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm", color)}>
        {Math.round(score * 10) / 10}
      </div>
      {label && <span className="text-[10px] text-muted-foreground">{label}</span>}
    </div>
  );
}

export function ShortlistCandidateCard({ candidate, existingFeedback, onApprove, onReject, jobId }: ShortlistCandidateCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const initials = candidate.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "?";
  const tags: string[] = candidate.qualification_tags || [];
  const hasFeedback = !!existingFeedback;

  const culturalScore = candidate.cultural_score != null ? candidate.cultural_score / 10 : null;
  const discScore = candidate.disc_score != null ? candidate.disc_score / 10 : null;
  const technicalScore = candidate.technical_score != null ? candidate.technical_score / 10 : null;
  const workHistory: any[] = candidate.work_history || candidate.recent_positions || [];

  return (
    <Card className={cn(
      "transition-all",
      hasFeedback && existingFeedback.decisao === "aprovado" && "border-green-300 bg-green-50/30 dark:bg-green-950/10",
      hasFeedback && existingFeedback.decisao === "reprovado" && "border-red-200 bg-red-50/20 dark:bg-red-950/10"
    )}>
      <CardContent className="p-6">
        {/* Collapsed state */}
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={candidate.avatar_url} />
            <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h3 className="text-lg font-semibold">{candidate.name}</h3>
              <ScoreCircle score={candidate.qualification_score} />
              {hasFeedback && (
                <Badge variant={existingFeedback.decisao === "aprovado" ? "default" : "destructive"} className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {existingFeedback.decisao === "aprovado" ? "Aprovado" : "Recusado"}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2 flex-wrap">
              {candidate.current_position && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" />
                  {candidate.current_position} {candidate.current_company ? `na ${candidate.current_company}` : ""}
                </span>
              )}
              {candidate.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {candidate.city}
                </span>
              )}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {tags.slice(0, 3).map((tag: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            )}

            {/* Actions */}
            {!hasFeedback && (
              <div className="flex items-center gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={onApprove}
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  <ThumbsUp className="h-4 w-4" />
                  Quero entrevistar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onReject}
                  className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                >
                  <ThumbsDown className="h-4 w-4" />
                  Não é o perfil
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Expandable section */}
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full mt-4 gap-2">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {expanded ? "Ocultar detalhes" : "Ver perfil completo"}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4 border-t pt-4">
            {/* Notas por dimensão */}
            {(culturalScore != null || discScore != null || technicalScore != null) && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Notas por dimensão</h4>
                <div className="flex gap-6">
                  {culturalScore != null && <ScoreCircle score={culturalScore} label="Cultural" />}
                  {discScore != null && <ScoreCircle score={discScore} label="Comportamental" />}
                  {technicalScore != null && <ScoreCircle score={technicalScore} label="Técnico" />}
                </div>
              </div>
            )}

            {/* Summary */}
            {candidate.qualification_summary && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Resumo Profissional</h4>
                <p className="text-sm text-muted-foreground">{candidate.qualification_summary}</p>
              </div>
            )}

            {/* Histórico profissional */}
            {workHistory.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Histórico Profissional</h4>
                <div className="space-y-2">
                  {workHistory.slice(0, 4).map((w, i) => (
                    <div key={i} className="text-sm border-l-2 border-primary/30 pl-3">
                      <p className="font-medium">{w.position || w.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {w.company} {w.start_date ? `· ${w.start_date}${w.end_date ? ` - ${w.end_date}` : " - atual"}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths */}
            {candidate.strengths && candidate.strengths.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Pontos Fortes</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {(Array.isArray(candidate.strengths) ? candidate.strengths : [candidate.strengths]).map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Concerns */}
            {candidate.concerns && candidate.concerns.length > 0 && (
              <div className="rounded-md bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 p-3">
                <h4 className="text-sm font-semibold mb-1 text-yellow-800 dark:text-yellow-200">Pontos de Atenção</h4>
                <ul className="list-disc list-inside text-sm text-yellow-900/80 dark:text-yellow-100/80 space-y-1">
                  {(Array.isArray(candidate.concerns) ? candidate.concerns : [candidate.concerns]).map((c: string, i: number) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* All tags */}
            {tags.length > 3 && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Competências</h4>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Ver transcrição */}
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => setTranscriptOpen(true)}
            >
              <FileText className="h-4 w-4" />
              Ver transcrição completa
            </Button>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

      <TranscriptDialog
        open={transcriptOpen}
        onOpenChange={setTranscriptOpen}
        candidateId={candidate.id}
        candidateName={candidate.name}
        jobId={jobId}
      />
    </Card>
  );
}
