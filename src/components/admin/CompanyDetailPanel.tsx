import { useState, useEffect } from "react";
import { Loader2, User, Mail, Shield, Target, Eye, Heart, BarChart3, Briefcase, Zap, BookOpen, GitBranch, Calendar, Flag } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAdminDashboard, CompanyDetails, ValuesDetail, DecisionDetail } from "@/hooks/useAdminDashboard";

interface CompanyDetailPanelProps {
  companyId: string;
  companyName: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
  viewer: "Visualizador",
};

const MISSION_QUESTIONS = [
  "Segmento de negócio",
  "O que a empresa faz",
  "Público-alvo",
  "Problemas que resolve",
  "Importância do problema",
  "Relevância do problema",
  "Impacto desejado no mundo",
  "Palavras-chave",
];

const VISION_QUESTIONS = [
  "Segmento de negócio",
  "O que a empresa faz",
  "Tipo de business",
  "Público-alvo",
  "Visão em 3-5 anos",
  "Direção dos esforços",
  "Medição de sucesso",
  "Forbes matéria imaginada",
  "Imagem mental da visão",
  "Palavras-chave repetidas",
];

const DECISION_QUESTIONS = [
  "Comportamentos intoleráveis",
  "Regras da empresa",
  "Critérios de decisão",
  "Lógica de contratação",
  "Lógica de demissão",
  "Lógica de promoção",
  "Abordagem geral de decisões",
];

export function CompanyDetailPanel({ companyId, companyName }: CompanyDetailPanelProps) {
  const { getCompanyDetails, getValuesDetail, getDecisionDetail } = useAdminDashboard();
  const [details, setDetails] = useState<CompanyDetails | null>(null);
  const [valuesDetail, setValuesDetail] = useState<ValuesDetail | null>(null);
  const [decisionDetail, setDecisionDetail] = useState<DecisionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    async function loadDetails() {
      setLoading(true);
      const [companyData, valuesData, decisionData] = await Promise.all([
        getCompanyDetails(companyId),
        getValuesDetail(companyId),
        getDecisionDetail(companyId),
      ]);
      setDetails(companyData);
      setValuesDetail(valuesData);
      setDecisionDetail(decisionData);
      setLoading(false);
    }
    loadDetails();
  }, [companyId, getCompanyDetails, getValuesDetail, getDecisionDetail]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Não foi possível carregar os detalhes
      </div>
    );
  }

  const missionAnswers = details.mission?.answers || {};
  const visionAnswers = details.vision?.answers || {};
  const missionAnalysis = details.mission?.analysis;
  const visionAnalysis = details.vision?.analysis;

  return (
    <div className="p-4 space-y-4">
      {/* Members Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4" />
            Membros da Equipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {details.members?.map((member) => (
              <div key={member.id} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {member.first_name} {member.last_name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span>{member.email}</span>
                    <Badge variant="outline" className="text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      {ROLE_LABELS[member.role] || member.role}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pillar Details Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="text-xs">Visão Geral</TabsTrigger>
          <TabsTrigger value="mission" className="text-xs">
            <Target className="h-3 w-3 mr-1" />
            Missão
          </TabsTrigger>
          <TabsTrigger value="vision" className="text-xs">
            <Eye className="h-3 w-3 mr-1" />
            Visão
          </TabsTrigger>
          <TabsTrigger value="values" className="text-xs">
            <Heart className="h-3 w-3 mr-1" />
            Valores
          </TabsTrigger>
          <TabsTrigger value="indicators" className="text-xs">
            <BarChart3 className="h-3 w-3 mr-1" />
            Indicadores
          </TabsTrigger>
          <TabsTrigger value="decision" className="text-xs">
            <GitBranch className="h-3 w-3 mr-1" />
            Decisão
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mission Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Missão
                </CardTitle>
              </CardHeader>
              <CardContent>
                {missionAnalysis?.mission ? (
                  <p className="text-sm font-medium">{missionAnalysis.mission}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Não definida</p>
                )}
              </CardContent>
            </Card>

            {/* Vision Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Visão
                </CardTitle>
              </CardHeader>
              <CardContent>
                {visionAnalysis?.vision_inspirational ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{visionAnalysis.vision_inspirational}</p>
                    {visionAnalysis.vision_measurable && (
                      <p className="text-xs text-muted-foreground">{visionAnalysis.vision_measurable}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Não definida</p>
                )}
              </CardContent>
            </Card>

            {/* Values Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Valores
                </CardTitle>
              </CardHeader>
              <CardContent>
                {valuesDetail?.final_values && valuesDetail.final_values.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {valuesDetail.final_values.map((v) => (
                      <Badge key={v.value_id} variant="secondary">{v.label}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Não definidos</p>
                )}
              </CardContent>
            </Card>

            {/* Indicators Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Indicadores
                </CardTitle>
              </CardHeader>
              <CardContent>
                {details.indicators?.segment ? (
                  <div className="space-y-2">
                    <Badge variant="outline">{details.indicators.segment}</Badge>
                    <p className="text-xs text-muted-foreground">
                      Stage: {details.indicators.stage}/3
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Não definidos</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="mission" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Declaração de Missão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {missionAnalysis?.mission && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="font-medium">{missionAnalysis.mission}</p>
                </div>
              )}
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Respostas</h4>
                {MISSION_QUESTIONS.map((question, index) => {
                  const answer = missionAnswers[index + 1];
                  return (
                    <div key={index} className="space-y-1">
                      <p className="text-xs text-muted-foreground">{index + 1}. {question}</p>
                      <p className="text-sm">{answer || <span className="text-muted-foreground">-</span>}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vision" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Declaração de Visão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(visionAnalysis?.vision_inspirational || visionAnalysis?.vision_measurable) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {visionAnalysis.vision_inspirational && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Inspiracional</p>
                      <p className="font-medium">{visionAnalysis.vision_inspirational}</p>
                    </div>
                  )}
                  {visionAnalysis.vision_measurable && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Mensurável</p>
                      <p className="font-medium">{visionAnalysis.vision_measurable}</p>
                    </div>
                  )}
                </div>
              )}
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Respostas</h4>
                {VISION_QUESTIONS.map((question, index) => {
                  const answer = visionAnswers[index + 1];
                  return (
                    <div key={index} className="space-y-1">
                      <p className="text-xs text-muted-foreground">{index + 1}. {question}</p>
                      <p className="text-sm">{answer || <span className="text-muted-foreground">-</span>}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="values" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Valores e Comportamentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {valuesDetail?.final_values && valuesDetail.final_values.length > 0 ? (
                <div className="space-y-4">
                  {valuesDetail.final_values.map((value) => {
                    const behaviors = valuesDetail.behaviors?.find(b => b.value_label === value.label);
                    return (
                      <div key={value.value_id} className="border rounded-lg p-4">
                        <h4 className="font-medium mb-2">{value.label}</h4>
                        {behaviors && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-green-600 font-medium mb-1">✅ Como vivemos</p>
                              <ul className="text-sm space-y-1">
                                {behaviors.do_selected?.map((d, i) => (
                                  <li key={i} className="text-muted-foreground">• {d}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="text-xs text-red-600 font-medium mb-1">❌ Como não vivemos</p>
                              <ul className="text-sm space-y-1">
                                {behaviors.dont_selected?.map((d, i) => (
                                  <li key={i} className="text-muted-foreground">• {d}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Valores não definidos</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="indicators" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Indicadores Estratégicos</CardTitle>
            </CardHeader>
            <CardContent>
              {details.indicators?.selected_step1 ? (
                <div className="space-y-4">
                  <Badge variant="outline" className="mb-4">
                    Segmento: {details.indicators.segment}
                  </Badge>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(details.indicators.selected_step1 as Record<string, string[]>).map(([perspective, indicators]) => (
                      <div key={perspective} className="border rounded-lg p-3">
                        <h5 className="text-sm font-medium mb-2 capitalize">{perspective}</h5>
                        <ul className="text-sm space-y-1">
                          {(indicators || []).map((ind, i) => (
                            <li key={i} className="text-muted-foreground">• {ind}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Indicadores não definidos</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decision" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Framework de Decisão</CardTitle>
            </CardHeader>
            <CardContent>
              {decisionDetail?.answers && decisionDetail.answers.length > 0 ? (
                <div className="space-y-4">
                  {DECISION_QUESTIONS.map((question, qIndex) => {
                    const questionAnswers = decisionDetail.answers?.filter(a => a.question_number === qIndex + 1) || [];
                    return (
                      <div key={qIndex} className="space-y-1">
                        <p className="text-sm font-medium">{qIndex + 1}. {question}</p>
                        <div className="pl-4 space-y-1">
                          {questionAnswers.length > 0 ? (
                            questionAnswers.map((ans, i) => (
                              <p key={i} className="text-sm text-muted-foreground">
                                • {ans.answer_text}
                                {ans.is_suggestion && <Badge variant="outline" className="ml-2 text-xs">sugestão</Badge>}
                              </p>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">-</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Decisões não definidas</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
