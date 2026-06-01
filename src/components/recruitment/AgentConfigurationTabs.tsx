import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw, FileText, List, Pencil, LayoutTemplate, Loader2, Bot, GitBranch, Database } from "lucide-react";
import { AgentOverviewTab } from "./tabs/AgentOverviewTab";
import { AgentQuestionsTab } from "./tabs/AgentQuestionsTab";
import { AgentEvaluationTab } from "./tabs/AgentEvaluationTab";
import { AgentInterviewsTab } from "./tabs/AgentInterviewsTab";
import { AgentPromptsTab } from "./tabs/AgentPromptsTab";
import { TechnicalAgentOverviewTab } from "./tabs/TechnicalAgentOverviewTab";
import { TechnicalAgentBankTab } from "./tabs/TechnicalAgentBankTab";
import { DISCAgentEvaluationTab } from "./tabs/DISCAgentEvaluationTab";
import { TechnicalAgentEvaluationTab } from "./tabs/TechnicalAgentEvaluationTab";

interface AgentQuestion {
  id: string;
  order: number;
  content: string;
}

interface AgentCriterion {
  id: string;
  name: string;
  description: string;
  excellenceDescription: string;
  warningSignsDescription: string;
  minimumScore: number;
  importance: "minor" | "moderate" | "important" | "very_important" | "critical";
  weight: number;
  color: string;
}

interface TechnicalAgentSettings {
  maxQuestionsPerSkill?: number;
  maxFollowUpDepth?: number;
  maxDurationMinutes?: number;
  includeDesiredSkills?: boolean;
}

interface AgentConfigurationTabsProps {
  agentId: string;
  accountId: string;
  agentType: "cultural" | "technical" | "disc";
  minimumScore: number;
  questions: AgentQuestion[];
  criteria: AgentCriterion[];
  settings?: Record<string, unknown>;
  onSaveQuestions?: (questions: AgentQuestion[]) => void;
  onSaveCriteria?: (criteria: AgentCriterion[]) => void;
  onSaveMinimumScore?: (minimumScore: number) => void;
  onSaveSettings?: (settings: Record<string, unknown>) => void;
  isSaving?: boolean;
}

export const AgentConfigurationTabs = ({
  agentId,
  accountId,
  agentType,
  minimumScore,
  questions: initialQuestions,
  criteria: initialCriteria,
  settings,
  onSaveQuestions,
  onSaveCriteria,
  onSaveMinimumScore,
  onSaveSettings,
  isSaving = false,
}: AgentConfigurationTabsProps) => {
  const [mainTab, setMainTab] = useState("configuration");
  const [configTab, setConfigTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [questions, setQuestions] = useState(initialQuestions);
  const [criteria, setCriteria] = useState(initialCriteria);
  const [agentMinimumScore, setAgentMinimumScore] = useState(minimumScore);

  // Update local state when props change
  useEffect(() => {
    setQuestions(initialQuestions);
  }, [initialQuestions]);

  useEffect(() => {
    setCriteria(initialCriteria);
  }, [initialCriteria]);

  useEffect(() => {
    setAgentMinimumScore(minimumScore);
  }, [minimumScore]);

  const handleSave = () => {
    if (onSaveQuestions) {
      onSaveQuestions(questions);
    }
    if (onSaveCriteria) {
      onSaveCriteria(criteria);
    }
    if (onSaveMinimumScore) {
      onSaveMinimumScore(agentMinimumScore);
    }
    setIsEditing(false);
  };

  const handleDiscard = () => {
    setQuestions(initialQuestions);
    setCriteria(initialCriteria);
    setAgentMinimumScore(minimumScore);
    setIsEditing(false);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Tabs value={mainTab} onValueChange={setMainTab} className="flex-1 flex flex-col min-h-0">
        <div className="border-b px-6 shrink-0">
          <TabsList className="h-12 bg-transparent p-0 gap-6">
            <TabsTrigger
              value="configuration"
              className="h-12 px-0 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none bg-transparent"
            >
              Configuração
            </TabsTrigger>
            <TabsTrigger
              value="interviews"
              className="h-12 px-0 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none bg-transparent"
            >
              Entrevistas
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="configuration" className="flex-1 flex flex-col mt-0 min-h-0">
          {agentType === "disc" ? (
            // DISC / Fit Comportamental Agent Interface
            <>
              <div className="border-b px-6 py-3 flex items-center justify-between shrink-0">
                <Tabs value={configTab} onValueChange={setConfigTab}>
                  <TabsList className="bg-muted/50">
                    <TabsTrigger value="overview" className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Visão Geral
                    </TabsTrigger>
                    <TabsTrigger value="evaluation" className="gap-2">
                      <List className="h-4 w-4" />
                      Avaliação
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {configTab === "overview" && (
                  <AgentOverviewTab minimumScore={minimumScore} criteria={criteria} />
                )}
                {configTab === "evaluation" && onSaveSettings && (
                  <DISCAgentEvaluationTab
                    settings={settings}
                    onSaveSettings={onSaveSettings}
                    isSaving={isSaving}
                  />
                )}
              </div>
            </>
          ) : agentType === "technical" ? (
            // Technical Agent Interface
            <>
              <div className="border-b px-6 py-3 flex items-center justify-between shrink-0">
                <Tabs value={configTab} onValueChange={setConfigTab}>
                  <TabsList className="bg-muted/50">
                    <TabsTrigger value="overview" className="gap-2">
                      <GitBranch className="h-4 w-4" />
                      Como Funciona
                    </TabsTrigger>
                    <TabsTrigger value="bank" className="gap-2">
                      <Database className="h-4 w-4" />
                      Banco de Perguntas
                    </TabsTrigger>
                    <TabsTrigger value="evaluation" className="gap-2">
                      <List className="h-4 w-4" />
                      Avaliação
                    </TabsTrigger>
                    <TabsTrigger value="prompts" className="gap-2">
                      <Bot className="h-4 w-4" />
                      Prompts IA
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {configTab === "overview" && (
                  <TechnicalAgentOverviewTab settings={settings as TechnicalAgentSettings} />
                )}
                {configTab === "bank" && (
                  <TechnicalAgentBankTab accountId={accountId} agentId={agentId} />
                )}
                {configTab === "evaluation" && onSaveSettings && (
                  <TechnicalAgentEvaluationTab
                    settings={settings}
                    onSaveSettings={onSaveSettings}
                    isSaving={isSaving}
                  />
                )}
                {configTab === "prompts" && (
                  <AgentPromptsTab agentId={agentId} />
                )}
              </div>
            </>
          ) : (
            // Cultural Agent Interface (existing)
            <>
              <div className="border-b px-6 py-3 flex items-center justify-between shrink-0">
                <Tabs value={configTab} onValueChange={setConfigTab}>
                  <TabsList className="bg-muted/50">
                    <TabsTrigger value="overview" className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Visão Geral
                    </TabsTrigger>
                    <TabsTrigger value="questions" className="gap-2">
                      <FileText className="h-4 w-4" />
                      Perguntas
                    </TabsTrigger>
                    <TabsTrigger value="evaluation" className="gap-2">
                      <List className="h-4 w-4" />
                      Avaliação
                    </TabsTrigger>
                    <TabsTrigger value="prompts" className="gap-2">
                      <Bot className="h-4 w-4" />
                      Prompts IA
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Button variant="outline" onClick={handleDiscard} disabled={isSaving}>
                        Descartar alterações
                      </Button>
                      <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Salvar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" className="gap-2">
                        <LayoutTemplate className="h-4 w-4" />
                        Modelos
                      </Button>
                      <Button variant="outline" className="gap-2" onClick={() => setIsEditing(true)}>
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {configTab === "overview" && (
                  <AgentOverviewTab minimumScore={minimumScore} criteria={criteria} />
                )}
                {configTab === "questions" && (
                  <AgentQuestionsTab
                    questions={questions}
                    isEditing={isEditing}
                    onQuestionsChange={setQuestions}
                    agentId={agentId}
                    agentType={agentType}
                  />
                )}
                {configTab === "evaluation" && (
                  <AgentEvaluationTab
                    minimumScore={agentMinimumScore}
                    criteria={criteria}
                    isEditing={isEditing}
                    onCriteriaChange={setCriteria}
                    onMinimumScoreChange={setAgentMinimumScore}
                  />
                )}
                {configTab === "prompts" && (
                  <AgentPromptsTab agentId={agentId} />
                )}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="interviews" className="flex-1 mt-0 p-6 overflow-y-auto">
          <AgentInterviewsTab agentId={agentId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
