import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Database,
  Sparkles,
  Check,
  X,
  MessageCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { TalentReactivationModal } from "./TalentReactivationModal";

interface TalentBankMatchesProps {
  jobId: string;
  accountId: string;
}

export function TalentBankMatches({ jobId, accountId }: TalentBankMatchesProps) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(true);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [showReactivation, setShowReactivation] = useState(false);

  const { data: matches, isLoading } = useQuery({
    queryKey: ["talent-bank-matches", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("talent_bank_matches")
        .select(`
          *,
          recruitment_candidates!inner(id, first_name, last_name, email, phone, tags)
        `)
        .eq("job_id", jobId)
        .eq("account_id", accountId)
        .order("similarity_score", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const runAutoMatch = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("talent-bank-auto-match", {
        body: { job_id: jobId, account_id: accountId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`${data.matches} candidatos encontrados no banco de talentos`);
      queryClient.invalidateQueries({ queryKey: ["talent-bank-matches", jobId] });
    },
    onError: (err: any) => {
      toast.error("Erro ao buscar no banco de talentos");
      console.error(err);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ matchId, status }: { matchId: string; status: string }) => {
      const { error } = await supabase
        .from("talent_bank_matches")
        .update({ status })
        .eq("id", matchId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["talent-bank-matches", jobId] });
    },
  });

  const toggleCandidate = (candidateId: string) => {
    setSelectedCandidates((prev) =>
      prev.includes(candidateId)
        ? prev.filter((id) => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const pendingMatches = matches?.filter((m: any) => m.status === "pending") || [];
  const otherMatches = matches?.filter((m: any) => m.status !== "pending") || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Banco de Talentos
              {matches && matches.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {matches.length} matches
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => runAutoMatch.mutate()}
                disabled={runAutoMatch.isPending}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${runAutoMatch.isPending ? "animate-spin" : ""}`} />
                {runAutoMatch.isPending ? "Buscando..." : "Buscar no Banco"}
              </Button>
              {pendingMatches.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedCandidates(pendingMatches.map((m: any) => m.candidate_id));
                    setShowReactivation(true);
                  }}
                  disabled={pendingMatches.length === 0}
                >
                  <MessageCircle className="h-3 w-3 mr-1" />
                  Reativar ({pendingMatches.length})
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        {expanded && (
          <CardContent className="pt-0">
            {!matches || matches.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <Database className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>Nenhum match encontrado ainda.</p>
                <p>Clique em "Buscar no Banco" para encontrar candidatos compatíveis.</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2">
                  {pendingMatches.map((match: any) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      selected={selectedCandidates.includes(match.candidate_id)}
                      onToggle={() => toggleCandidate(match.candidate_id)}
                      onApprove={() => updateStatus.mutate({ matchId: match.id, status: "approved" })}
                      onReject={() => updateStatus.mutate({ matchId: match.id, status: "rejected" })}
                    />
                  ))}
                  {otherMatches.length > 0 && pendingMatches.length > 0 && (
                    <div className="text-xs text-muted-foreground pt-2 pb-1">
                      Já processados ({otherMatches.length})
                    </div>
                  )}
                  {otherMatches.map((match: any) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      selected={false}
                      onToggle={() => {}}
                      onApprove={() => {}}
                      onReject={() => {}}
                      disabled
                    />
                  ))}
                </div>
              </ScrollArea>
            )}

            {selectedCandidates.length > 0 && (
              <div className="mt-3 pt-3 border-t flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {selectedCandidates.length} selecionados
                </span>
                <Button
                  size="sm"
                  onClick={() => setShowReactivation(true)}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Gerar Mensagens de Reativação
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {showReactivation && (
        <TalentReactivationModal
          open={showReactivation}
          onClose={() => {
            setShowReactivation(false);
            setSelectedCandidates([]);
            queryClient.invalidateQueries({ queryKey: ["talent-bank-matches", jobId] });
          }}
          jobId={jobId}
          accountId={accountId}
          candidateIds={selectedCandidates}
        />
      )}
    </>
  );
}

function MatchCard({
  match,
  selected,
  onToggle,
  onApprove,
  onReject,
  disabled = false,
}: {
  match: any;
  selected: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
  disabled?: boolean;
}) {
  const candidate = match.recruitment_candidates;
  const scorePercent = Math.round(match.similarity_score * 100);

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    contacted: "bg-blue-100 text-blue-800",
  };

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
        selected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
      } ${disabled ? "opacity-60" : ""}`}
      onClick={disabled ? undefined : onToggle}
    >
      <div className="flex-shrink-0 mt-0.5">
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{[candidate?.first_name, candidate?.last_name].filter(Boolean).join(" ") || "Candidato"}</span>
          <Badge variant="outline" className="text-xs">
            {scorePercent}%
          </Badge>
          {match.status !== "pending" && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${statusColors[match.status] || ""}`}>
              {match.status}
            </span>
          )}
        </div>
        {match.match_reasoning && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {match.match_reasoning}
          </p>
        )}
        {candidate?.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {candidate.tags.slice(0, 4).map((tag: string, i: number) => (
              <Badge key={i} variant="secondary" className="text-[10px] h-4">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {!disabled && match.status === "pending" && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={(e) => { e.stopPropagation(); onApprove(); }}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={(e) => { e.stopPropagation(); onReject(); }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
