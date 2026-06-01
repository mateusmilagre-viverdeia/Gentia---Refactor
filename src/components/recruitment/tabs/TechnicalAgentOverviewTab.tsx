import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  GitBranch, 
  ArrowDown, 
  ArrowRight, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2,
  Zap,
  Clock,
  Target,
  FileText
} from "lucide-react";

interface TechnicalAgentOverviewTabProps {
  settings?: {
    maxQuestionsPerSkill?: number;
    maxFollowUpDepth?: number;
    maxDurationMinutes?: number;
    includeDesiredSkills?: boolean;
  };
}

export const TechnicalAgentOverviewTab = ({ settings }: TechnicalAgentOverviewTabProps) => {
  const config = {
    maxQuestionsPerSkill: settings?.maxQuestionsPerSkill ?? 3,
    maxFollowUpDepth: settings?.maxFollowUpDepth ?? 2,
    maxDurationMinutes: settings?.maxDurationMinutes ?? 25,
    includeDesiredSkills: settings?.includeDesiredSkills ?? true,
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-transparent rounded-xl p-6 border border-primary/20">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <GitBranch className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">Entrevista Técnica Adaptativa</h2>
            <p className="text-muted-foreground">
              Este agente utiliza a <strong>Árvore Inteligente</strong> para conduzir entrevistas técnicas 
              que se adaptam em tempo real às respostas do candidato. As perguntas são geradas 
              automaticamente a partir das skills definidas no Job Description da vaga.
            </p>
          </div>
        </div>
      </div>

      {/* Smart Tree Diagram */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Como Funciona a Árvore Inteligente
          </CardTitle>
          <CardDescription>
            O sistema adapta as perguntas baseado na qualidade das respostas do candidato
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative bg-muted/30 rounded-lg p-6 overflow-x-auto">
            {/* Tree Visualization */}
            <div className="flex flex-col items-center min-w-[600px]">
              {/* Root Node */}
              <div className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium text-center shadow-md">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Skill do Job Description
                </div>
                <div className="text-xs opacity-80 mt-1">Ex: "React com TypeScript"</div>
              </div>
              
              {/* Connector */}
              <div className="h-8 w-px bg-border" />
              <ArrowDown className="h-4 w-4 text-muted-foreground -mt-1 -mb-1" />
              <div className="h-4 w-px bg-border" />
              
              {/* First Question */}
              <div className="bg-card border-2 border-primary/30 px-4 py-2 rounded-lg text-sm font-medium">
                Pergunta Principal sobre a Skill
              </div>
              
              {/* Branch Connector */}
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center">
                <div className="w-32 h-px bg-border" />
                <div className="w-px h-4 bg-border" />
                <div className="w-32 h-px bg-border" />
              </div>
              
              {/* Response Branches */}
              <div className="flex gap-8 mt-2">
                {/* Superficial */}
                <div className="flex flex-col items-center">
                  <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Superficial
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <ArrowDown className="h-3 w-3 text-muted-foreground" />
                  <div className="bg-muted px-3 py-2 rounded text-xs text-center max-w-[140px]">
                    <strong>Aprofunda</strong>
                    <br />
                    "Pode dar um exemplo prático?"
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Até {config.maxFollowUpDepth} níveis
                  </div>
                </div>
                
                {/* Correta */}
                <div className="flex flex-col items-center">
                  <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Correta
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <ArrowRight className="h-3 w-3 text-muted-foreground rotate-90" />
                  <div className="bg-muted px-3 py-2 rounded text-xs text-center max-w-[140px]">
                    <strong>Próxima Skill</strong>
                    <br />
                    Avança no roteiro
                  </div>
                </div>
                
                {/* Excelente */}
                <div className="flex flex-col items-center">
                  <div className="bg-primary/10 text-primary px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Excelente
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <ArrowDown className="h-3 w-3 text-muted-foreground" />
                  <div className="bg-muted px-3 py-2 rounded text-xs text-center max-w-[140px]">
                    <strong>Desafia</strong>
                    <br />
                    "E se fosse em produção com 1M usuários?"
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Até {config.maxFollowUpDepth} níveis
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{config.maxQuestionsPerSkill}</p>
                <p className="text-sm text-muted-foreground">Perguntas por skill</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <GitBranch className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{config.maxFollowUpDepth}</p>
                <p className="text-sm text-muted-foreground">Níveis de profundidade</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{config.maxDurationMinutes}min</p>
                <p className="text-sm text-muted-foreground">Duração máxima</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{config.includeDesiredSkills ? "Sim" : "Não"}</p>
                <p className="text-sm text-muted-foreground">Skills desejáveis</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* How it works list */}
      <Card>
        <CardHeader>
          <CardTitle>Fluxo da Entrevista</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <Badge variant="outline" className="mt-0.5 shrink-0">1</Badge>
              <div>
                <p className="font-medium">Extração de Skills</p>
                <p className="text-sm text-muted-foreground">
                  O sistema lê o Job Description e identifica as skills obrigatórias e desejáveis
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Badge variant="outline" className="mt-0.5 shrink-0">2</Badge>
              <div>
                <p className="font-medium">Geração de Perguntas</p>
                <p className="text-sm text-muted-foreground">
                  Para cada skill, a IA gera perguntas técnicas contextualizadas
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Badge variant="outline" className="mt-0.5 shrink-0">3</Badge>
              <div>
                <p className="font-medium">Entrevista por Voz</p>
                <p className="text-sm text-muted-foreground">
                  O candidato responde por voz, a IA transcreve e avalia em tempo real
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Badge variant="outline" className="mt-0.5 shrink-0">4</Badge>
              <div>
                <p className="font-medium">Adaptação Inteligente</p>
                <p className="text-sm text-muted-foreground">
                  Baseado na resposta, o sistema decide: aprofundar, avançar ou desafiar
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Badge variant="outline" className="mt-0.5 shrink-0">5</Badge>
              <div>
                <p className="font-medium">Score Final</p>
                <p className="text-sm text-muted-foreground">
                  Ao final, cada skill recebe uma nota de 0-100 e o candidato recebe um score geral
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
