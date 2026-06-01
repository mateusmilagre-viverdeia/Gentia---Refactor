import { useState } from "react";
import { Bot, Brain, TestTubeDiagonal, CheckCircle2, Users, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CandidateProfileModal } from "@/components/recruitment/CandidateProfileModal";
import { cn } from "@/lib/utils";
import { useGlobalFunnelKanban, type FunnelStage, type GlobalFunnelCandidate } from "@/hooks/useGlobalFunnelKanban";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";

const STAGE_META: Record<FunnelStage, { icon: typeof Bot; color: string; bgLight: string }> = {
  screening: { icon: Filter, color: "bg-amber-500", bgLight: "bg-amber-50 dark:bg-amber-950/20" },
  cultural: { icon: Bot, color: "bg-purple-500", bgLight: "bg-purple-50 dark:bg-purple-950/20" },
  disc: { icon: Brain, color: "bg-indigo-500", bgLight: "bg-indigo-50 dark:bg-indigo-950/20" },
  technical: { icon: TestTubeDiagonal, color: "bg-cyan-500", bgLight: "bg-cyan-50 dark:bg-cyan-950/20" },
  approved: { icon: CheckCircle2, color: "bg-green-500", bgLight: "bg-green-50 dark:bg-green-950/20" },
};

const MAX_VISIBLE = 15;

interface GlobalFunnelKanbanProps {
  period: DashboardPeriod;
}

function CandidateCard({ candidate, onClick }: { candidate: GlobalFunnelCandidate; onClick: () => void }) {
  const initials = candidate.name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const scores = [
    { label: "C", value: candidate.cultureScore, done: candidate.cultureCompleted },
    { label: "D", value: candidate.discScore, done: candidate.discCompleted },
    { label: "T", value: candidate.techScore, done: candidate.techCompleted },
  ];

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start gap-2">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{candidate.name}</p>
          <p className="text-xs text-muted-foreground truncate">{candidate.jobTitle}</p>
          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
            {scores.map(s => s.done && s.value != null ? (
              <Badge
                key={s.label}
                variant={s.value >= 70 ? "success" : s.value >= 40 ? "warning" : "destructive"}
                className="text-[9px] px-1.5 py-0"
              >
                {s.label}: {Math.round(s.value)}%
              </Badge>
            ) : null)}
          </div>
        </div>
      </div>
    </button>
  );
}

export function GlobalFunnelKanban({ period }: GlobalFunnelKanbanProps) {
  const { columns, totalCandidates, isLoading } = useGlobalFunnelKanban(period);
  const [expandedColumns, setExpandedColumns] = useState<Set<FunnelStage>>(new Set());
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const toggleExpand = (key: FunnelStage) => {
    setExpandedColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleCandidateClick = (candidate: GlobalFunnelCandidate) => {
    setSelectedSessionId(candidate.cultureSessionId);
    setModalOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-48 w-64 flex-shrink-0" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">Funil Gerencial Global</CardTitle>
          <span className="text-xs text-muted-foreground ml-1">
            ({totalCandidates} candidatos)
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Visão consolidada de todos os candidatos em todas as vagas
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-2 min-w-max">
            {columns.map(col => {
              const meta = STAGE_META[col.key];
              const Icon = meta.icon;
              const isExpanded = expandedColumns.has(col.key);
              const visible = isExpanded ? col.candidates : col.candidates.slice(0, MAX_VISIBLE);
              const hasMore = col.candidates.length > MAX_VISIBLE && !isExpanded;

              return (
                <div
                  key={col.key}
                  className={cn(
                    "flex flex-col w-64 min-h-[300px] rounded-lg border",
                    meta.bgLight
                  )}
                >
                  <div className="flex items-center gap-2 p-3 border-b">
                    <div className={cn("w-2 h-2 rounded-full", meta.color)} />
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{col.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {col.candidates.length}
                    </span>
                  </div>

                  <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[400px]">
                    {visible.length === 0 ? (
                      <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
                        Nenhum candidato nesta etapa
                      </div>
                    ) : (
                      <>
                        {visible.map(candidate => (
                          <CandidateCard
                            key={`${candidate.candidateId}-${candidate.jobId}`}
                            candidate={candidate}
                            onClick={() => handleCandidateClick(candidate)}
                          />
                        ))}
                        {hasMore && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs"
                            onClick={() => toggleExpand(col.key)}
                          >
                            Ver todos ({col.candidates.length - MAX_VISIBLE} restantes)
                          </Button>
                        )}
                        {isExpanded && col.candidates.length > MAX_VISIBLE && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs"
                            onClick={() => toggleExpand(col.key)}
                          >
                            Recolher
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>

      <CandidateProfileModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        sessionId={selectedSessionId}
      />
    </Card>
  );
}
