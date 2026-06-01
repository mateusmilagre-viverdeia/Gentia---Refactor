import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Target, 
  MessageSquare, 
  Clock,
  User,
  FileText,
  ChevronDown,
  ChevronUp,
  Quote
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { InterviewIntegrityBanner } from "./InterviewIntegrityBanner";
import { formatBRT } from "@/lib/datetime";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface CultureInterviewResultSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
}

export function CultureInterviewResultSheet({
  open,
  onOpenChange,
  sessionId,
}: CultureInterviewResultSheetProps) {
  const [expandedCriteria, setExpandedCriteria] = useState<string[]>([]);

  const toggleCriterion = (id: string) => {
    setExpandedCriteria(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const { data: session, isLoading } = useQuery({
    queryKey: ["culture-interview-session", sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      
      const { data, error } = await supabase
        .from("culture_interview_sessions")
        .select(`
          *,
          candidate:candidate_profiles(
            id, full_name, first_name, last_name
          )
        `)
        .eq("id", sessionId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId && open,
  });

  const { data: criteriaEvaluations } = useQuery({
    queryKey: ["culture-interview-criteria", sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const { data, error } = await supabase
        .from("culture_interview_criteria_evaluations")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId && open,
  });

  const { data: responses = [] } = useQuery({
    queryKey: ["culture-interview-responses", sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      
      const { data, error } = await supabase
        .from("culture_interview_responses")
        .select("*")
        .eq("session_id", sessionId)
        .order("question_index");
      
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId && open,
  });

  if (!sessionId) return null;

  const score = session?.matching_score || 0;
  const analysis = session?.matching_analysis || "";
  const candidateName = session?.candidate?.full_name || 
    `${session?.candidate?.first_name || ''} ${session?.candidate?.last_name || ''}`.trim() ||
    "Candidato";
  const duration = session?.duration_seconds 
    ? `${Math.floor(session.duration_seconds / 60)}:${(session.duration_seconds % 60).toString().padStart(2, '0')}`
    : "-";
  const completedAt = session?.completed_at 
    ? formatBRT(new Date(session.completed_at), "d 'de' MMMM 'às' HH:mm")
    : "-";

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-green-600";
    if (score >= 50) return "text-orange-500";
    return "text-gray-500";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 75) return { label: "Alta Compatibilidade", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" };
    if (score >= 50) return { label: "Média Compatibilidade", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" };
    return { label: "Baixa Compatibilidade", color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400" };
  };

  const scoreBadge = getScoreBadge(score);

  // Parse pillar evaluations from analysis if present (fallback)
  const pillarMatch = analysis.match(/## Avaliação por Pilar:\n([\s\S]*?)(?=\n\n|$)/);
  const pillarSection = pillarMatch ? pillarMatch[1] : "";
  const mainAnalysis = analysis.replace(/\n\n## Avaliação por Pilar:[\s\S]*$/, "");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[700px] overflow-y-auto p-0">
        <SheetHeader className="p-6 pb-0 space-y-1">
          <div className="flex items-center justify-between pr-8">
            <SheetTitle>Resultado da Entrevista Cultural</SheetTitle>
            {(session?.is_test || (session as any)?.evaluation_audit_trail?.version === 'v3') && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 animate-pulse">
                Simulação V3
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {candidateName} • {completedAt}
          </p>
        </SheetHeader>

        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-100px)]">
            <div className="p-6 space-y-6">
              <InterviewIntegrityBanner
                type="cultural"
                sessionId={sessionId!}
                status={session?.status}
                isPartial={(session as any)?.is_partial_evaluation}
                completedNaturally={session?.completed_naturally}
                abandonedReason={(session as any)?.abandoned_reason}
                audioStatus={(session as any)?.audio_status}
                hasAudio={!!session?.audio_url}
                hasTranscript={!!session?.partial_transcript || responses.length > 0}
                hasEvaluation={!!session?.matching_score}
              />

              {/* Score Card */}
              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-6">
                    {/* Score Circle */}
                    <div className="relative">
                      <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center ${
                        score >= 75 ? 'border-green-500' : score >= 50 ? 'border-orange-500' : 'border-gray-400'
                      }`}>
                        <span className={`text-3xl font-bold ${getScoreColor(score)}`}>
                          {score}
                        </span>
                      </div>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                        <Badge className={scoreBadge.color}>
                          {scoreBadge.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Meta Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>{candidateName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{duration} min</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MessageSquare className="h-4 w-4" />
                        <span>{responses.length} perguntas respondidas</span>
                      </div>
                      <Progress value={score} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs */}
              <Tabs defaultValue="transcript" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="transcript" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Perguntas
                  </TabsTrigger>
                  <TabsTrigger value="analysis" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Parecer
                  </TabsTrigger>
                  <TabsTrigger value="pillars" className="gap-2">
                    <Target className="h-4 w-4" />
                    Pilares
                  </TabsTrigger>
                  <TabsTrigger value="responses" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Respostas
                  </TabsTrigger>
                </TabsList>

                {/* Analysis Tab */}
                <TabsContent value="analysis" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Parecer Completo
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{mainAnalysis || "Análise não disponível."}</ReactMarkdown>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Pillars Tab */}
                <TabsContent value="pillars" className="mt-4 space-y-4">
                  {criteriaEvaluations && criteriaEvaluations.length > 0 ? (
                    criteriaEvaluations.map((ev, idx) => {
                      const alignment = ev.alignment_level;
                      const alignmentColor = alignment === "Forte" 
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : alignment === "Moderado"
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
                      
                      const questions = Array.isArray(ev.questions_used) ? ev.questions_used : [];
                      
                      return (
                        <Card key={ev.id || idx}>
                          <CardContent className="pt-4 space-y-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Target className="h-4 w-4 text-primary" />
                                  <h4 className="font-semibold">{ev.criterion_name}</h4>
                                  <Badge className={alignmentColor}>{alignment}</Badge>
                                  <span className="text-xs font-medium text-muted-foreground ml-auto">
                                    {ev.score?.toFixed(1)}%
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground mb-4">{ev.justification}</p>
                                
                                {questions.length > 0 && (
                                  <Collapsible
                                    open={expandedCriteria.includes(ev.id)}
                                    onOpenChange={() => toggleCriterion(ev.id)}
                                    className="border rounded-lg bg-muted/20"
                                  >
                                    <CollapsibleTrigger asChild>
                                      <button className="w-full p-2 flex items-center justify-between text-xs font-medium text-muted-foreground hover:bg-muted/40 transition-colors">
                                        <span className="flex items-center gap-1.5">
                                          <MessageSquare className="h-3 w-3" />
                                          Questões usadas para avaliar ({questions.length})
                                        </span>
                                        {expandedCriteria.includes(ev.id) ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                      </button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="p-3 space-y-3 border-t bg-background">
                                      {questions.map((q: any, qIdx: number) => (
                                        <div key={qIdx} className="space-y-2">
                                          <div className="flex gap-2">
                                            <span className="text-[10px] font-mono text-muted-foreground mt-0.5">Q{q.number ?? qIdx}</span>
                                            <p className="text-xs font-medium">{q.question}</p>
                                          </div>
                                          {Array.isArray(q.evidenceQuotes) && q.evidenceQuotes.length > 0 && (
                                            <div className="ml-5 p-2 bg-primary/5 border-l-2 border-primary/30 rounded-r-md">
                                              <div className="flex items-center gap-1.5 mb-1">
                                                <Quote className="h-3 w-3 text-primary opacity-50" />
                                                <span className="text-[10px] uppercase font-bold text-primary/70 tracking-wider">Evidência</span>
                                              </div>
                                              <ul className="space-y-1">
                                                {q.evidenceQuotes.map((quote: string, quoteIdx: number) => (
                                                  <li key={quoteIdx} className="text-xs text-muted-foreground italic leading-relaxed">
                                                    "{quote}"
                                                  </li>
                                                ))}
                                              </ul>
                                            </div>
                                          )}
                                          {qIdx < questions.length - 1 && <div className="border-b border-border/50 pt-1" />}
                                        </div>
                                      ))}
                                    </CollapsibleContent>
                                  </Collapsible>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  ) : pillarSection ? (
                    pillarSection.split('\n\n').filter(Boolean).map((pillar, idx) => {
                      const match = pillar.match(/\*\*(.+?)\*\*\s*\((\w+)\):\s*(.+)/);
                      if (!match) return null;
                      
                      const [, name, alignment, justification] = match;
                      const alignmentColor = alignment === "Forte" 
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : alignment === "Moderado"
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
                      
                      return (
                        <Card key={idx}>
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Target className="h-4 w-4 text-primary" />
                                  <h4 className="font-semibold">{name}</h4>
                                  <Badge className={alignmentColor}>{alignment}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{justification}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  ) : (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Avaliação por pilares não disponível.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Transcript Tab - Q&A */}
                <TabsContent value="transcript" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        Perguntas e Respostas
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {responses.length > 0 ? (
                        responses.map((response, idx) => (
                          <div key={response.id} className="space-y-3">
                            {/* Question */}
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                                {idx + 1}
                              </div>
                              <div className="flex-1">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Entrevistador</p>
                                <p className="font-medium text-sm">
                                  {response.question_text}
                                </p>
                              </div>
                            </div>
                            
                            {/* Answer */}
                            <div className="flex items-start gap-3 ml-11">
                              <div className="flex-1 p-3 bg-muted/50 rounded-lg border-l-2 border-primary/30">
                                <p className="text-xs font-medium text-muted-foreground mb-1">{candidateName}</p>
                                <p className="text-sm text-foreground">
                                  {response.candidate_response || "Sem resposta"}
                                </p>
                              </div>
                            </div>

                            {idx < responses.length - 1 && (
                              <div className="border-b border-border/50 pt-2" />
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-muted-foreground">
                          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Nenhuma pergunta e resposta registrada.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Responses Tab */}
                <TabsContent value="responses" className="mt-4 space-y-4">
                  {responses.length > 0 ? (
                    responses.map((response, idx) => (
                      <Card key={response.id}>
                        <CardContent className="pt-4">
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                                {idx + 1}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-sm mb-1">
                                  {response.question_text}
                                </p>
                                {response.value_label && (
                                  <Badge variant="outline" className="mb-2 text-xs">
                                    {response.value_label}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="ml-9 p-3 bg-muted/50 rounded-lg">
                              <p className="text-sm text-foreground">
                                {response.candidate_response || "Sem resposta"}
                              </p>
                            </div>

                            {response.ai_comment && (
                              <div className="ml-9 flex items-start gap-2 text-sm text-muted-foreground">
                                <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                                <p className="italic">{response.ai_comment}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma resposta registrada.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
