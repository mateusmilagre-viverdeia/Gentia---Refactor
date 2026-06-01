import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RecruitmentLayout } from "@/components/layout/RecruitmentLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/recruitment/StatusBadge";
import { CreateAgentDialog, AgentFormData } from "@/components/recruitment/CreateAgentDialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, Bot, Loader2, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { toast } from "sonner";
import { useAccount } from "@/hooks/useAccount";
import { useRecruitmentActions } from "@/hooks/useRecruitmentActions";
import { useValuesQuestionsForAgent } from "@/hooks/useValuesQuestionsForAgent";
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
import { formatBRT } from "@/lib/datetime";

interface Agent {
  id: string;
  name: string;
  description: string | null;
  type: string;
  language: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  interview_count?: number;
}

const AGENT_TYPE_OPTIONS = [
  { value: "all", label: "Todos os tipos" },
  { value: "culture", label: "Cultura" },
  { value: "technical", label: "Técnico" },
  { value: "behavioral", label: "Comportamental" },
  { value: "screening", label: "Triagem" },
];

const AgentsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { account: currentAccount } = useAccount();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<string | null>(null);
  
  const { duplicateAgent, deleteAgent } = useRecruitmentActions();
  const { importQuestionsToAgent, importCriteriaToAgent } = useValuesQuestionsForAgent();

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["recruitment-agents", currentAccount?.id],
    queryFn: async () => {
      if (!currentAccount?.id) return [];
      
      const { data, error } = await supabase
        .from("recruitment_agents")
        .select("*")
        .eq("account_id", currentAccount.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching agents:", error);
        throw error;
      }

      return data as Agent[];
    },
    enabled: !!currentAccount?.id,
  });

  const createAgentMutation = useMutation({
    mutationFn: async (agentData: AgentFormData): Promise<{
      id: string;
      importedQuestions: number;
      importedCriteria: number;
      importError?: boolean;
    }> => {
      if (!currentAccount?.id) throw new Error("No account selected");
      
      const { data, error } = await supabase
        .from("recruitment_agents")
        .insert({
          account_id: currentAccount.id,
          name: agentData.name,
          description: agentData.description || null,
          type: agentData.type,
          language: agentData.language,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      
      // If cultural fit template, import questions and criteria automatically
      if (agentData.template === "cultural_fit") {
        let importedQuestionsCount = 0;
        let importedCriteriaCount = 0;
        let hasError = false;

        try {
          importedQuestionsCount = await importQuestionsToAgent(data.id);
        } catch (importError) {
          console.error("Error importing questions:", importError);
          hasError = true;
        }

        try {
          importedCriteriaCount = await importCriteriaToAgent(data.id);
        } catch (importError) {
          console.error("Error importing criteria:", importError);
          hasError = true;
        }

        return { 
          id: data.id, 
          importedQuestions: importedQuestionsCount,
          importedCriteria: importedCriteriaCount,
          importError: hasError 
        };
      }
      
      return { id: data.id, importedQuestions: 0, importedCriteria: 0 };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-agents"] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-agent", data.id] });
      
      const hasImports = data.importedQuestions > 0 || data.importedCriteria > 0;
      
      if (hasImports) {
        const parts = [];
        if (data.importedQuestions > 0) {
          parts.push(`${data.importedQuestions} perguntas`);
        }
        if (data.importedCriteria > 0) {
          parts.push(`${data.importedCriteria} critérios`);
        }
        
        if (data.importError) {
          toast.warning(`Agente criado com ${parts.join(" e ")} importados (alguns itens falharam)`);
        } else {
          toast.success(`Agente criado com ${parts.join(" e ")} importados!`);
        }
      } else if (data.importError) {
        toast.warning("Agente criado, mas houve erro ao importar dados");
      } else {
        toast.success("Agente criado com sucesso!");
      }
      
      setIsCreateDialogOpen(false);
      navigate(`/atracao-contratacao/recrutamento/agents/${data.id}`);
    },
    onError: (error) => {
      console.error("Error creating agent:", error);
      toast.error("Erro ao criar agente");
    },
  });
  const filteredAgents = agents.filter((agent) => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (agent.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesType = typeFilter === "all" || agent.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const toggleSelectAll = () => {
    if (selectedAgents.length === filteredAgents.length) {
      setSelectedAgents([]);
    } else {
      setSelectedAgents(filteredAgents.map((a) => a.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedAgents((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const languageLabels: Record<string, string> = {
    "pt-BR": "Português (Brasil)",
    en: "Inglês",
    es: "Espanhol",
  };

  const handleDuplicate = (agentId: string) => {
    duplicateAgent.mutate({ agentId });
  };

  const handleDeleteClick = (agentId: string) => {
    setAgentToDelete(agentId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (agentToDelete) {
      deleteAgent.mutate({ agentId: agentToDelete });
      setDeleteDialogOpen(false);
      setAgentToDelete(null);
    }
  };

  const handleExportConfig = (agent: Agent) => {
    const config = {
      name: agent.name,
      description: agent.description,
      type: agent.type,
      language: agent.language,
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

  return (
    <RecruitmentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">
              Agentes <span className="text-muted-foreground font-normal">({agents.length})</span>
            </h1>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar agente
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar agentes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                {AGENT_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {typeFilter !== "all" && (
              <Button variant="ghost" size="icon" onClick={() => setTypeFilter("all")}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bot className="h-12 w-12 mb-4" />
              <p>Nenhum agente encontrado</p>
              <Button 
                variant="link" 
                onClick={() => setIsCreateDialogOpen(true)}
                className="mt-2"
              >
                Criar primeiro agente
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedAgents.length === filteredAgents.length && filteredAgents.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Idioma</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgents.map((agent) => (
                  <TableRow 
                    key={agent.id} 
                    className="cursor-pointer"
                    onClick={() => navigate(`/atracao-contratacao/recrutamento/agents/${agent.id}`)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedAgents.includes(agent.id)}
                        onCheckedChange={() => toggleSelect(agent.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Bot className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{agent.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {agent.description || "Sem descrição"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={agent.type} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {languageLabels[agent.language] || agent.language}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatBRT(new Date(agent.created_at), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/atracao-contratacao/recrutamento/agents/${agent.id}`)}>
                            Editar agente
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/atracao-contratacao/recrutamento/agents/${agent.id}/testar`)}>
                            🎙️ Testar agente (demo)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/atracao-contratacao/recrutamento/interviews?agent=${agent.id}`)}>
                            Ver entrevistas
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(agent.id)}>
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExportConfig(agent)}>
                            Exportar configuração
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDeleteClick(agent.id)}
                          >
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <CreateAgentDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={(data) => createAgentMutation.mutate(data)}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o agente
              e todas as suas perguntas e critérios configurados.
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

export default AgentsPage;
