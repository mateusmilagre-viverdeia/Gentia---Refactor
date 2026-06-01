import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { User, Mail, Phone, Linkedin } from "lucide-react";

interface CandidateData {
  id: string;
  nome: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  composite_score: number;
  cultural_score?: number | null;
  disc_score?: number | null;
  technical_score?: number | null;
  strengths: string[];
  concerns?: string[];
  resumo_profissional: string;
  destaque: string;
  transcript_excerpt?: string;
}

interface ReportCandidateSectionProps {
  candidate: CandidateData;
  rank: number;
  showScores: boolean;
  showContact: boolean;
  showTranscripts: boolean;
}

const RANK_BADGES = ["🥇", "🥈", "🥉"];

export function ReportCandidateSection({ candidate, rank, showScores, showContact, showTranscripts }: ReportCandidateSectionProps) {
  return (
    <div className="border rounded-xl p-6 space-y-4">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          {rank <= 3 ? (
            <span className="text-xl">{RANK_BADGES[rank - 1]}</span>
          ) : (
            <User className="h-5 w-5 text-primary" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold">{candidate.nome}</h3>
            {candidate.destaque && (
              <Badge variant="secondary" className="text-xs">{candidate.destaque}</Badge>
            )}
          </div>

          {showContact && (
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {candidate.email && (
                <a href={`mailto:${candidate.email}`} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {candidate.email}
                </a>
              )}
              {candidate.phone && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {candidate.phone}
                </span>
              )}
              {candidate.linkedin_url && (
                <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                  <Linkedin className="h-3 w-3" /> LinkedIn
                </a>
              )}
            </div>
          )}
        </div>

        {showScores && (
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-primary">{candidate.composite_score}%</div>
            <p className="text-xs text-muted-foreground">Score geral</p>
          </div>
        )}
      </div>

      {/* Resumo Profissional */}
      <div className="bg-muted/30 rounded-lg p-4">
        <p className="text-sm leading-relaxed">{candidate.resumo_profissional}</p>
      </div>

      {/* Scores breakdown */}
      {showScores && (
        <div className="grid grid-cols-3 gap-3">
          {candidate.cultural_score != null && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Cultural</p>
              <Progress value={candidate.cultural_score} className="h-2" />
              <p className="text-xs font-medium mt-0.5">{candidate.cultural_score}%</p>
            </div>
          )}
          {candidate.disc_score != null && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Comportamental</p>
              <Progress value={candidate.disc_score} className="h-2" />
              <p className="text-xs font-medium mt-0.5">{candidate.disc_score}%</p>
            </div>
          )}
          {candidate.technical_score != null && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Técnico</p>
              <Progress value={candidate.technical_score} className="h-2" />
              <p className="text-xs font-medium mt-0.5">{candidate.technical_score}%</p>
            </div>
          )}
        </div>
      )}

      {/* Strengths */}
      {candidate.strengths?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">Pontos Fortes</p>
          <div className="flex flex-wrap gap-1.5">
            {candidate.strengths.map((s, i) => (
              <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Concerns - Yellow attention points */}
      {candidate.concerns && candidate.concerns.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 mb-1.5">⚠️ Pontos de Atenção</p>
          <ul className="list-disc list-inside text-xs text-yellow-700 dark:text-yellow-400 space-y-0.5">
            {candidate.concerns.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Transcript */}
      {showTranscripts && candidate.transcript_excerpt && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Ver trecho da entrevista
          </summary>
          <div className="mt-2 bg-muted/20 rounded p-3 whitespace-pre-wrap text-muted-foreground">
            {candidate.transcript_excerpt}
          </div>
        </details>
      )}
    </div>
  );
}
