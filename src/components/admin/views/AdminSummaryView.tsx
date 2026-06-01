import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Target, Eye, Heart, BarChart3, FolderKanban, 
  Zap, GraduationCap, Scale, CheckCircle2, AlertCircle 
} from 'lucide-react';
import { CompanyDetails, ValuesDetail, DecisionDetail, ProjectsDetail, EnergyDetail, DevelopmentDetail, IndicatorsDetail } from '@/hooks/useAdminDashboard';
import logoGentia from "@/assets/logo-gentia.png";

interface AllCompanyData {
  details: CompanyDetails | null;
  values: ValuesDetail | null;
  decision: DecisionDetail | null;
  projects: ProjectsDetail[] | null;
  energy: EnergyDetail | null;
  development: DevelopmentDetail | null;
  event: any | null;
  ritual: any | null;
  indicators: IndicatorsDetail | null;
}

interface AdminSummaryViewProps {
  data: AllCompanyData;
}

const DECISION_QUESTIONS = [
  "O que é INTOLERÁVEL na nossa empresa?",
  "Quais são as REGRAS invioláveis da empresa?",
  "Qual CRITÉRIO usamos para tomar decisões?",
  "Por que devemos CONTRATAR alguém?",
  "Por que devemos DEMITIR alguém?",
  "Por que devemos PROMOVER alguém?",
  "Como tomamos DECISÕES na empresa?"
];

export function AdminSummaryView({ data }: AdminSummaryViewProps) {
  const { details, values, decision, projects, energy, development, indicators } = data;

  const pillars = [
    {
      name: 'Missão',
      icon: Target,
      completed: !!(details?.mission?.analysis?.mission),
      summary: details?.mission?.analysis?.mission || 'Não definida',
    },
    {
      name: 'Visão',
      icon: Eye,
      completed: !!(details?.vision?.final_vision),
      summary: details?.vision?.final_vision || 'Não definida',
    },
    {
      name: 'Valores',
      icon: Heart,
      completed: values?.final_values && values.final_values.length > 0,
      summary: values?.final_values?.map(v => v.label).join(', ') || 'Não definidos',
    },
    {
      name: 'Indicadores',
      icon: BarChart3,
      completed: indicators?.final_selection && indicators.final_selection.length > 0,
      summary: `${indicators?.final_selection?.length || 0} KPIs selecionados`,
    },
    {
      name: 'Projetos',
      icon: FolderKanban,
      completed: projects && projects.length > 0,
      summary: `${projects?.length || 0} projetos estratégicos`,
    },
    {
      name: 'Energia',
      icon: Zap,
      completed: energy?.selections?.some(s => s.phase === 3),
      summary: `${energy?.selections?.filter(s => s.phase === 3).length || 0} rituais selecionados`,
    },
    {
      name: 'Desenvolvimento',
      icon: GraduationCap,
      completed: development?.selections?.some(s => s.phase === 3),
      summary: `${development?.selections?.filter(s => s.phase === 3).length || 0} rituais selecionados`,
    },
    {
      name: 'Decisão',
      icon: Scale,
      completed: decision?.answers && decision.answers.length > 0,
      summary: `${decision?.answers?.length || 0} respostas registradas`,
    },
  ];

  const completedCount = pillars.filter(p => p.completed).length;
  const progressPercentage = Math.round((completedCount / pillars.length) * 100);

  // Combine values with their behaviors
  const valuesWithBehaviors = (values?.final_values || []).map(v => {
    const behavior = values?.behaviors?.find(b => b.value_label === v.label);
    return {
      ...v,
      dos: behavior?.do_selected || [],
      donts: behavior?.dont_selected || []
    };
  });
  
  // Get final energy and development selections
  const energyFinal = energy?.selections?.filter(s => s.phase === 3) || [];
  const developmentFinal = development?.selections?.filter(s => s.phase === 3) || [];

  // Get indicators by perspective
  const indicatorsByPerspective = indicators?.selected_step1 || {};

  // Group projects by perspective
  const projectsByPerspective = (projects || []).reduce((acc, project) => {
    const perspective = project.perspective || 'Outros';
    if (!acc[perspective]) acc[perspective] = [];
    acc[perspective].push(project);
    return acc;
  }, {} as Record<string, ProjectsDetail[]>);

  // Group decision answers by question
  const answersByQuestion = (decision?.answers || []).reduce((acc, answer) => {
    const q = answer.question_number;
    if (!acc[q]) acc[q] = [];
    acc[q].push(answer.answer_text);
    return acc;
  }, {} as Record<number, string[]>);

  const companyName = details?.company?.name || 'Empresa';

  return (
    <div className="space-y-6">
      {/* PDF Header - hidden on screen */}
      <div className="hidden print:block text-center mb-8 pt-4">
        <img src={logoGentia} alt="Gent.IA" className="h-48 w-auto mx-auto mb-4" />
        <h1 className="text-2xl font-bold">{companyName}</h1>
        <p className="text-muted-foreground">Código de Cultura Organizacional</p>
      </div>

      {/* Progress Overview */}
      <Card className="border-2 border-primary/20 bg-primary/5 print:border print:bg-transparent">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Progresso Geral
            <Badge variant={progressPercentage === 100 ? 'default' : 'secondary'} className="text-lg px-4 py-1">
              {progressPercentage}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-muted rounded-full h-3 mb-4">
            <div 
              className="bg-primary h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {completedCount} de {pillars.length} pilares concluídos
          </p>
        </CardContent>
      </Card>

      {/* Pillars Grid - visible on screen only */}
      <div className="grid md:grid-cols-2 gap-4 print:hidden">
        {pillars.map((pillar) => {
          const Icon = pillar.icon;
          
          return (
            <Card key={pillar.name} className={pillar.completed ? 'border-green-200' : 'border-amber-200'}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-5 w-5" />
                  {pillar.name}
                  {pillar.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500 ml-auto" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {pillar.summary}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ===== DETAILED CONTENT FOR PDF ===== */}
      
      {/* Mission Section */}
      {details?.mission?.analysis?.mission && (
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Missão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">{details.mission.analysis.mission}</p>
            {details.mission.analysis?.keywords && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">Palavras-chave:</p>
                <div className="flex flex-wrap gap-2">
                  {details.mission.analysis.keywords.map((kw: string, i: number) => (
                    <Badge key={i} variant="outline">{kw}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vision Section */}
      {details?.vision?.final_vision && (
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Visão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">{details.vision.final_vision}</p>
            {details.vision.selected_vision_type && (
              <Badge variant="secondary" className="mt-2">
                {details.vision.selected_vision_type === 'inspirational' ? 'Inspiracional' : 'Mensurável'}
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* Values Section */}
      {valuesWithBehaviors.length > 0 && (
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Valores ({valuesWithBehaviors.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {valuesWithBehaviors.map((value, index) => (
              <div key={index} className="border-b pb-4 last:border-0 last:pb-0">
                <h4 className="font-semibold text-lg mb-3">{value.label}</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  {value.dos && value.dos.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-green-700 mb-2">✅ Como vivemos</p>
                      <ul className="space-y-1">
                        {value.dos.map((d: string, i: number) => (
                          <li key={i} className="text-sm text-muted-foreground">• {d}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {value.donts && value.donts.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-red-700 mb-2">❌ Como não vivemos</p>
                      <ul className="space-y-1">
                        {value.donts.map((d: string, i: number) => (
                          <li key={i} className="text-sm text-muted-foreground">• {d}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Indicators Section */}
      {Object.keys(indicatorsByPerspective).length > 0 && (
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Indicadores Estratégicos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(indicatorsByPerspective).map(([perspective, kpis]) => (
              <div key={perspective}>
                <h4 className="font-medium mb-2 capitalize">{perspective}</h4>
                <div className="flex flex-wrap gap-2">
                  {(kpis as string[]).map((kpi, i) => (
                    <Badge key={i} variant="outline">{kpi}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Projects Section */}
      {Object.keys(projectsByPerspective).length > 0 && (
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5" />
              Projetos Estratégicos ({projects?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(projectsByPerspective).map(([perspective, perspectiveProjects]) => (
              <div key={perspective}>
                <h4 className="font-medium mb-2 capitalize">{perspective}</h4>
                <div className="space-y-2">
                  {perspectiveProjects.map((project, i) => (
                    <div key={i} className="border rounded p-3">
                      <p className="font-medium">{project.project_name}</p>
                      {project.description && (
                        <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                      )}
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        {project.responsible && <span>👤 {project.responsible}</span>}
                        {project.start_quarter && <span>📅 {project.start_quarter}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Energy Section */}
      {energyFinal.length > 0 && (
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Rituais de Energia ({energyFinal.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {energyFinal.map((sel, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Badge variant="outline">{sel.category_label}</Badge>
                  <span className="text-sm">{sel.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Development Section */}
      {developmentFinal.length > 0 && (
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Rituais de Desenvolvimento ({developmentFinal.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {developmentFinal.map((sel, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Badge variant="outline">{sel.category_label}</Badge>
                  <span className="text-sm">{sel.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Decision Section */}
      {Object.keys(answersByQuestion).length > 0 && (
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Framework de Tomada de Decisão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(answersByQuestion).map(([qNum, answers]) => (
              <div key={qNum} className="border-b pb-4 last:border-0 last:pb-0">
                <h4 className="font-medium mb-2">{DECISION_QUESTIONS[parseInt(qNum) - 1]}</h4>
                <ul className="space-y-1">
                  {answers.map((answer, i) => (
                    <li key={i} className="text-sm text-muted-foreground">• {answer}</li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Company Info */}
      {details?.company && (
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-base">Informações da Empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Nome</p>
                <p className="font-medium">{details.company.name}</p>
              </div>
              {details.company.sector && (
                <div>
                  <p className="text-muted-foreground">Setor</p>
                  <p className="font-medium">{details.company.sector}</p>
                </div>
              )}
              {details.company.employees_count && (
                <div>
                  <p className="text-muted-foreground">Funcionários</p>
                  <p className="font-medium">{details.company.employees_count}</p>
                </div>
              )}
              {details.members && (
                <div>
                  <p className="text-muted-foreground">Membros da Equipe</p>
                  <p className="font-medium">{details.members.length}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Members */}
      {details?.members && details.members.length > 0 && (
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-base">Equipe ({details.members.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {details.members.map((member) => (
                <Badge key={member.id} variant="outline">
                  {member.first_name} {member.last_name} ({member.role})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Print watermark */}
      <div className="hidden print-watermark">
        <img src={logoGentia} alt="Gent.IA" />
        <div>Desenvolvido com Gent.IA</div>
      </div>
    </div>
  );
}
