import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, CheckCircle2, Clock, Eye, Send, BarChart3, TrendingUp } from "lucide-react";
;
import type { Survey, SurveyStats, QuestionStats, SurveyInvitation } from "@/types/survey.types";
import { CATEGORY_ICONS, CATEGORY_LABELS } from "@/types/survey.types";
import { SurveyComparisonReport, SurveyInstanceData } from "./SurveyComparisonReport";

interface SurveyDashboardProps {
  survey: Survey;
  stats: SurveyStats | null;
  questionStats: QuestionStats[];
  invitations: SurveyInvitation[];
  onBack: () => void;
  onSendReminder: (userId: string) => void;
  isLoading?: boolean;
  comparisonData?: SurveyInstanceData[];
  isLoadingComparison?: boolean;
}

export function SurveyDashboard({
  survey,
  stats,
  questionStats,
  invitations,
  onBack,
  onSendReminder,
  isLoading,
  comparisonData = [],
  isLoadingComparison,
}: SurveyDashboardProps) {
  const categoryIcon = survey.category ? CATEGORY_ICONS[survey.category as keyof typeof CATEGORY_ICONS] : '📋';
  const categoryLabel = survey.category ? CATEGORY_LABELS[survey.category as keyof typeof CATEGORY_LABELS] : 'Questionário';

  const pendingInvitations = invitations.filter((i) => i.status !== 'completed');
  const completedInvitations = invitations.filter((i) => i.status === 'completed');

  const isRecurring = survey.is_recurring || survey.parent_survey_id;
  const showComparisonTab = isRecurring;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>

      <div className="flex items-start gap-4">
        <span className="text-4xl">{categoryIcon}</span>
        <div>
          <h1 className="text-2xl font-semibold">{survey.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{categoryLabel}</Badge>
            {survey.is_anonymous && <Badge variant="outline">Anônimo</Badge>}
            {isRecurring && (
              <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                <TrendingUp className="h-3 w-3 mr-1" />
                Recorrente
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalInvited || 0}</p>
                <p className="text-xs text-muted-foreground">Enviados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalResponded || 0}</p>
                <p className="text-xs text-muted-foreground">Respondidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.pending || 0}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.responseRate || 0}%</p>
                <p className="text-xs text-muted-foreground">Taxa de resposta</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="results">
        <TabsList>
          <TabsTrigger value="results">Resultados</TabsTrigger>
          <TabsTrigger value="respondents">Respondentes ({invitations.length})</TabsTrigger>
          {showComparisonTab && (
            <TabsTrigger value="comparison">
              <TrendingUp className="h-4 w-4 mr-1" />
              Comparativo
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="results" className="space-y-4 mt-4">
          {questionStats.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma resposta recebida ainda</p>
              </CardContent>
            </Card>
          ) : (
            questionStats.map((qs, idx) => (
              <Card key={qs.questionId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">
                    {idx + 1}. {qs.questionText}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{qs.responses} respostas</p>
                </CardHeader>
                <CardContent>
                  {(qs.questionType === 'single_choice' || qs.questionType === 'multiple_choice') &&
                    qs.distribution && (
                      <div className="space-y-2">
                        {Object.entries(qs.distribution).map(([option, count]) => (
                          <div key={option} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{option}</span>
                              <span className="text-muted-foreground">
                                {count} ({qs.responses > 0 ? Math.round((count / qs.responses) * 100) : 0}%)
                              </span>
                            </div>
                            <Progress
                              value={qs.responses > 0 ? (count / qs.responses) * 100 : 0}
                              className="h-2"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                  {qs.questionType === 'scale' && qs.average !== undefined && (
                    <div className="flex items-center gap-4">
                      <div className="text-4xl font-bold">{qs.average.toFixed(1)}</div>
                      <div className="text-sm text-muted-foreground">média de 5</div>
                    </div>
                  )}

                  {qs.questionType === 'nps' && qs.nps && (
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary">{qs.nps.score}</div>
                        <div className="text-xs text-muted-foreground">NPS Score</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-semibold text-green-500">{qs.nps.promoters}</div>
                        <div className="text-xs text-muted-foreground">Promotores</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-semibold text-amber-500">{qs.nps.passives}</div>
                        <div className="text-xs text-muted-foreground">Neutros</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-semibold text-red-500">{qs.nps.detractors}</div>
                        <div className="text-xs text-muted-foreground">Detratores</div>
                      </div>
                    </div>
                  )}

                  {qs.questionType === 'text' && qs.textResponses && qs.textResponses.length > 0 && (
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {qs.textResponses.map((text, i) => (
                          <div key={i} className="p-3 bg-muted/50 rounded-md text-sm">
                            "{text}"
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="respondents" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="divide-y">
                  {invitations.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum convite enviado ainda</p>
                    </div>
                  ) : (
                    invitations.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              inv.status === 'completed'
                                ? 'bg-green-500'
                                : inv.status === 'viewed'
                                ? 'bg-amber-500'
                                : 'bg-muted-foreground'
                            }`}
                          />
                          <div>
                            <p className="font-medium">{inv.user_name || 'Usuário'}</p>
                            <p className="text-xs text-muted-foreground">{inv.user_email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {inv.status === 'completed' ? (
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Respondido
                            </Badge>
                          ) : inv.status === 'viewed' ? (
                            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                              <Eye className="h-3 w-3 mr-1" />
                              Visualizado
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              Pendente
                            </Badge>
                          )}
                          {inv.status !== 'completed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onSendReminder(inv.user_id)}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {showComparisonTab && (
          <TabsContent value="comparison" className="mt-4">
            <SurveyComparisonReport
              instances={comparisonData}
              isLoading={isLoadingComparison}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
