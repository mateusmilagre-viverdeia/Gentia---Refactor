import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, ClipboardList, History, Plus } from "lucide-react";
import { ScorecardForm } from "./ScorecardForm";
import { ScorecardSummary } from "./ScorecardSummary";
import { 
  useScorecardTemplates, 
  useScorecardTemplate,
  stageLabels 
} from "@/hooks/useRecruitmentScorecards";
import { useEvaluations } from "@/hooks/useRecruitmentEvaluations";

interface EvaluationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  candidateName: string;
  currentStage?: string;
}

export function EvaluationDialog({
  open,
  onOpenChange,
  applicationId,
  candidateName,
  currentStage = "screening",
}: EvaluationDialogProps) {
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState(currentStage);
  
  const { data: templates, isLoading: isLoadingTemplates } = useScorecardTemplates();
  const { data: selectedTemplate, isLoading: isLoadingTemplate } = useScorecardTemplate(selectedTemplateId);
  const { data: evaluations, isLoading: isLoadingEvaluations } = useEvaluations(applicationId);

  // Get templates for the selected stage
  const stageTemplates = templates?.filter(t => t.stage === selectedStage) || [];

  // Auto-select default template when stage changes
  const handleStageChange = (stage: string) => {
    setSelectedStage(stage);
    const defaultTemplate = templates?.find(t => t.stage === stage && t.is_default);
    if (defaultTemplate) {
      setSelectedTemplateId(defaultTemplate.id);
    } else if (stageTemplates.length > 0) {
      setSelectedTemplateId(stageTemplates[0].id);
    } else {
      setSelectedTemplateId(null);
    }
  };

  const handleSuccess = () => {
    setActiveTab("history");
  };

  const stages = Object.entries(stageLabels);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Avaliar: {candidateName}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "new" | "history")} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Avaliação
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico ({evaluations?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="flex-1 overflow-hidden mt-4">
            {isLoadingTemplates ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : templates && templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ClipboardList className="h-12 w-12 text-muted-foreground mb-3" />
                <h3 className="font-medium mb-1">Nenhum template disponível</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Crie templates de scorecard para avaliar candidatos
                </p>
                <Button variant="outline">
                  Criar Template
                </Button>
              </div>
            ) : (
              <div className="flex flex-col h-full gap-4">
                {/* Stage and Template Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Etapa</Label>
                    <Select value={selectedStage} onValueChange={handleStageChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a etapa" />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Template</Label>
                    <Select 
                      value={selectedTemplateId || ""} 
                      onValueChange={setSelectedTemplateId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates?.filter(t => t.stage === selectedStage).map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                            {template.is_default && " (Padrão)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Scorecard Form */}
                {isLoadingTemplate ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : selectedTemplate ? (
                  <div className="flex-1 overflow-hidden">
                    <ScorecardForm
                      applicationId={applicationId}
                      template={selectedTemplate}
                      stage={selectedStage}
                      onSuccess={handleSuccess}
                      onCancel={() => onOpenChange(false)}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    Selecione um template para começar a avaliação
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="flex-1 overflow-hidden mt-4">
            {isLoadingEvaluations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScorecardSummary 
                evaluations={evaluations || []} 
                applicationId={applicationId}
              />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
