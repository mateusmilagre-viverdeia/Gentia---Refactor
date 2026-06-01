import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight, Send, X, MapPin } from "lucide-react";
import type { CrossMatchSuggestion } from "@/hooks/useCrossMatchSuggestions";

interface Props {
  suggestion: CrossMatchSuggestion;
  onForward: () => void;
  onReject: () => void;
  disabled?: boolean;
}

function scoreColor(score: number) {
  if (score >= 85) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
  if (score >= 70) return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";
  return "bg-muted text-muted-foreground border-border";
}

export function CrossMatchSuggestionCard({ suggestion, onForward, onReject, disabled }: Props) {
  const c = suggestion.candidate;
  const fullName = c ? `${c.first_name} ${c.last_name}`.trim() : "Candidato removido";
  const initials = c ? `${c.first_name?.[0] || ""}${c.last_name?.[0] || ""}`.toUpperCase() : "??";

  return (
    <Card className="hover:border-primary/40 transition-colors">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-11 w-11 shrink-0">
            <AvatarImage src={c?.avatar_url || undefined} alt={fullName} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{fullName}</p>
                {c?.email && <p className="text-xs text-muted-foreground truncate">{c.email}</p>}
              </div>
              <Badge variant="outline" className={scoreColor(suggestion.match_score)}>
                {suggestion.match_score}%
              </Badge>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2 flex-wrap">
              {suggestion.source_job?.title && (
                <>
                  <span className="truncate max-w-[140px]">{suggestion.source_job.title}</span>
                  <ArrowRight className="h-3 w-3 shrink-0" />
                </>
              )}
              <span className="font-medium text-foreground truncate max-w-[160px]">
                {suggestion.suggested_job?.title || "Vaga removida"}
              </span>
              {suggestion.suggested_job?.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {suggestion.suggested_job.location}
                </span>
              )}
            </div>
          </div>
        </div>

        {suggestion.reasoning && (
          <p className="text-xs text-muted-foreground line-clamp-2 border-l-2 border-primary/30 pl-3 italic">
            {suggestion.reasoning}
          </p>
        )}

        {suggestion.status === "pending" ? (
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="flex-1" onClick={onForward} disabled={disabled}>
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Encaminhar
            </Button>
            <Button size="sm" variant="outline" onClick={onReject} disabled={disabled}>
              <X className="h-3.5 w-3.5 mr-1.5" />
              Ignorar
            </Button>
          </div>
        ) : (
          <Badge
            variant={suggestion.status === "rejeitado" ? "destructive" : "default"}
            className="w-full justify-center py-1"
          >
            {suggestion.status === "aprovado" && "✓ Encaminhado"}
            {suggestion.status === "rejeitado" && "Ignorado"}
            {suggestion.status === "imported" && "Importado para vaga"}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
