import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { RecruitmentLayout } from "@/components/layout/RecruitmentLayout";
import { AgentDetailsSidebar } from "@/components/recruitment/AgentDetailsSidebar";
import { AgentConfigurationTabs } from "@/components/recruitment/AgentConfigurationTabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, Loader2, Mic } from "lucide-react";
import { useRecruitmentAgent } from "@/hooks/useRecruitmentAgent";
import { useRecruitmentActions } from "@/hooks/useRecruitmentActions";
import { toast } from "sonner";

const AgentDetailsPage = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { agent, isLoading, error, saveQuestions, saveCriteria, saveMinimumScore, saveSettings, isSaving } = useRecruitmentAgent(agentId);
  const { duplicateAgent, deleteAgent } = useRecruitmentActions();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDuplicate = () => {
    if (agentId) {
      duplicateAgent.mutate({ agentId });
    }
  };

  const handleExportConfig = () => {
    if (!agent) return;
    
    const config = {
      name: agent.name,
      description: agent.description,
      type: agent.type,
      language: agent.language,
      minimumScore: agent.minimumScore,
      questions: agent.questions,
      criteria: agent.criteria,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `agent-${agent.name.toLowerCase().replace(/\s+/g, "-")}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Configuração exportada");
  };

  const handleConfirmDelete = () => {
    if (agentId) {
      deleteAgent.mutate({ agentId }, {
        onSuccess: () => {
          navigate("/atracao-contratacao/recrutamento/agents");
        }
      });
      setDeleteDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <RecruitmentLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </RecruitmentLayout>
    );
  }

  if (error || !agent) {
    return (
      <RecruitmentLayout>
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <p className="text-muted-foreground">Agente não encontrado</p>
          <Button asChild variant="outline">
            <Link to="/atracao-contratacao/recrutamento/agents">Voltar para Agentes</Link>
          </Button>
        </div>
      </RecruitmentLayout>
    );
  }

  return (
    <RecruitmentLayout>
      <div className="flex flex-col h-full -m-6">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/atracao-contratacao/recrutamento/agents">Agentes</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{agent.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/atracao-contratacao/recrutamento/agents/${agentId}/testar`)}
            >
              <Mic className="h-4 w-4 mr-2" />
              Testar agente
            </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDuplicate}>
                Duplicar agente
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportConfig}>
                Exportar configuração
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                Excluir agente
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          <AgentDetailsSidebar agent={{
            name: agent.name,
            description: agent.description || "",
            type: agent.type as "structured" | "adaptive",
            language: agent.language,
            createdAt: agent.createdAt,
            updatedAt: agent.updatedAt,
          }} />
          <AgentConfigurationTabs
            agentId={agent.id}
            accountId={agent.accountId}
            agentType={agent.type === "adaptive" ? "technical" : agent.type === "disc" ? "disc" : "cultural"}
            minimumScore={agent.minimumScore}
            questions={agent.questions}
            criteria={agent.criteria}
            settings={agent.settings}
            onSaveQuestions={saveQuestions}
            onSaveCriteria={saveCriteria}
            onSaveMinimumScore={saveMinimumScore}
            onSaveSettings={saveSettings}
            isSaving={isSaving}
          />
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o agente
              "{agent.name}" e todas as suas perguntas e critérios configurados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RecruitmentLayout>
  );
};

export default AgentDetailsPage;
