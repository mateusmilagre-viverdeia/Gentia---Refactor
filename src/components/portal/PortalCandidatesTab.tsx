import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Users, X } from "lucide-react";
import {
  getCompositeScoreBadgeVariant,
  getCompositeScoreColor,
} from "@/lib/compositeScore";

interface PortalCandidatesTabProps {
  candidates: any[];
  feedbacks: any[];
  isLoading: boolean;
}

// Mapeamento de status (etapa) para PT-BR
const STAGE_LABELS: Record<string, string> = {
  screening: "Triagem",
  cultural_fit: "Fit Cultural",
  cultural: "Fit Cultural",
  technical_interview: "Entrevista Técnica",
  technical: "Entrevista Técnica",
  interview: "Entrevista",
  shortlisted: "Shortlist",
  offer: "Proposta",
  hired: "Contratado",
  rejected: "Reprovado",
  disqualified: "Reprovado",
  applied: "Inscrito",
};

const STAGE_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | "purple"> = {
  screening: "info",
  cultural_fit: "purple",
  cultural: "purple",
  technical_interview: "info",
  technical: "info",
  interview: "info",
  shortlisted: "default",
  offer: "warning",
  hired: "success",
  rejected: "destructive",
  disqualified: "destructive",
  applied: "secondary",
};

function getStageBadge(status: string) {
  const label = STAGE_LABELS[status] || status;
  const variant = STAGE_VARIANTS[status] || "secondary";
  return <Badge variant={variant}>{label}</Badge>;
}

function getDecisionBadge(candidateId: string, feedbacks: any[]) {
  const feedback = feedbacks.find((f: any) => f.candidato_id === candidateId);
  if (!feedback) return <Badge variant="secondary">Pendente</Badge>;
  if (feedback.decisao === "aprovado") return <Badge variant="success">Aprovado</Badge>;
  if (feedback.decisao === "reprovado") return <Badge variant="destructive">Reprovado</Badge>;
  return <Badge variant="secondary">{feedback.decisao}</Badge>;
}

function getScoreBadge(score: number | null | undefined) {
  if (score == null) return <Badge variant="secondary">—</Badge>;
  const numScore = Number(score);
  const variant = getCompositeScoreBadgeVariant(numScore);
  return <Badge variant={variant}>{Math.round(numScore)}</Badge>;
}

function getDecisionStatus(candidateId: string, feedbacks: any[]): "pendente" | "aprovado" | "reprovado" {
  const feedback = feedbacks.find((f: any) => f.candidato_id === candidateId);
  if (!feedback) return "pendente";
  if (feedback.decisao === "aprovado") return "aprovado";
  if (feedback.decisao === "reprovado") return "reprovado";
  return "pendente";
}

export function PortalCandidatesTab({ candidates, feedbacks, isLoading }: PortalCandidatesTabProps) {
  const [filterJob, setFilterJob] = useState<string>("all");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterDecision, setFilterDecision] = useState<string>("all");
  const [selectedApp, setSelectedApp] = useState<any | null>(null);

  // Lista de vagas únicas
  const jobOptions = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach((app: any) => {
      if (app.jobTitle) set.add(app.jobTitle);
    });
    return Array.from(set).sort();
  }, [candidates]);

  // Lista de etapas únicas presentes
  const stageOptions = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach((app: any) => {
      if (app.status) set.add(app.status);
    });
    return Array.from(set);
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter((app: any) => {
      if (!app.recruitment_candidates) return false;
      if (filterJob !== "all" && app.jobTitle !== filterJob) return false;
      if (filterStage !== "all" && app.status !== filterStage) return false;
      if (filterDecision !== "all") {
        const decision = getDecisionStatus(app.recruitment_candidates.id, feedbacks);
        if (decision !== filterDecision) return false;
      }
      return true;
    });
  }, [candidates, feedbacks, filterJob, filterStage, filterDecision]);

  const hasFilters = filterJob !== "all" || filterStage !== "all" || filterDecision !== "all";
  const clearFilters = () => {
    setFilterJob("all");
    setFilterStage("all");
    setFilterDecision("all");
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium">Nenhum candidato apresentado</h3>
        <p className="text-muted-foreground">Os candidatos aparecerão aqui quando forem incluídos na shortlist.</p>
      </div>
    );
  }

  const selectedCandidate = selectedApp?.recruitment_candidates;
  const selectedFeedback = selectedCandidate
    ? feedbacks.find((f: any) => f.candidato_id === selectedCandidate.id)
    : null;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterJob} onValueChange={setFilterJob}>
          <SelectTrigger className="w-[200px] h-9">
            <SelectValue placeholder="Vaga" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as vagas</SelectItem>
            {jobOptions.map(job => (
              <SelectItem key={job} value={job}>{job}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStage} onValueChange={setFilterStage}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Etapa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as etapas</SelectItem>
            {stageOptions.map(stage => (
              <SelectItem key={stage} value={stage}>
                {STAGE_LABELS[stage] || stage}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterDecision} onValueChange={setFilterDecision}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Decisão" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as decisões</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="aprovado">Aprovado</SelectItem>
            <SelectItem value="reprovado">Reprovado</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
            <X className="h-3.5 w-3.5 mr-1" />
            Limpar
          </Button>
        )}

        <span className="text-xs text-muted-foreground ml-auto">
          {filteredCandidates.length} de {candidates.length}
        </span>
      </div>

      {/* Tabela */}
      {filteredCandidates.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground">Nenhum candidato corresponde aos filtros aplicados.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidato</TableHead>
              <TableHead>Cargo Atual</TableHead>
              <TableHead>Vaga</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Etapa atual</TableHead>
              <TableHead>Decisão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCandidates.map((app: any) => {
              const candidate = app.recruitment_candidates;
              if (!candidate) return null;
              return (
                <TableRow
                  key={app.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedApp(app)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={candidate.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {candidate.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{candidate.name}</p>
                        <p className="text-xs text-muted-foreground">{candidate.city || "—"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {candidate.current_position ? (
                      <div>
                        <p>{candidate.current_position}</p>
                        <p className="text-xs text-muted-foreground">{candidate.current_company}</p>
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-sm">{app.jobTitle}</TableCell>
                  <TableCell>{getScoreBadge(app.score)}</TableCell>
                  <TableCell>{getStageBadge(app.status)}</TableCell>
                  <TableCell>{getDecisionBadge(candidate.id, feedbacks)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Drawer de detalhes */}
      <Sheet open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selectedCandidate && (
            <>
              <SheetHeader className="text-left">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedCandidate.avatar_url} />
                    <AvatarFallback>
                      {selectedCandidate.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="truncate">{selectedCandidate.name}</SheetTitle>
                    {selectedCandidate.current_position && (
                      <p className="text-sm text-muted-foreground truncate">
                        {selectedCandidate.current_position}
                        {selectedCandidate.current_company && ` · ${selectedCandidate.current_company}`}
                      </p>
                    )}
                    {selectedCandidate.city && (
                      <p className="text-xs text-muted-foreground">{selectedCandidate.city}</p>
                    )}
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Score Composto */}
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                    Score Composto
                  </p>
                  <p className={`text-4xl font-semibold ${getCompositeScoreColor(selectedApp.score ?? null)}`}>
                    {selectedApp.score != null ? Math.round(Number(selectedApp.score)) : "—"}
                  </p>
                </div>

                {/* Scores Detalhados */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Scores Detalhados</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Cultural</p>
                      <p className={`text-lg font-semibold mt-1 ${getCompositeScoreColor(selectedApp.cultural_score ?? null)}`}>
                        {selectedApp.cultural_score != null ? Math.round(Number(selectedApp.cultural_score)) : "—"}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">DISC</p>
                      <p className={`text-lg font-semibold mt-1 ${getCompositeScoreColor(selectedApp.disc_score ?? null)}`}>
                        {selectedApp.disc_score != null ? Math.round(Number(selectedApp.disc_score)) : "—"}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Técnico</p>
                      <p className={`text-lg font-semibold mt-1 ${getCompositeScoreColor(selectedApp.technical_score ?? null)}`}>
                        {selectedApp.technical_score != null ? Math.round(Number(selectedApp.technical_score)) : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Resumo */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Resumo</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedCandidate.qualification_summary
                      || selectedCandidate.resumo_ia
                      || selectedCandidate.summary
                      || "Sem resumo disponível."}
                  </p>
                </div>

                {/* Vaga */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Vaga</h4>
                  <div className="rounded-lg border p-3 space-y-2">
                    <p className="text-sm font-medium">{selectedApp.jobTitle}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">Etapa:</span>
                      {getStageBadge(selectedApp.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">Decisão:</span>
                      {getDecisionBadge(selectedCandidate.id, feedbacks)}
                    </div>
                    {selectedFeedback?.motivo && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground mb-1">Motivo:</p>
                        <p className="text-sm">{selectedFeedback.motivo}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <SheetFooter className="mt-6">
                <SheetClose asChild>
                  <Button variant="outline" className="w-full">Fechar</Button>
                </SheetClose>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
