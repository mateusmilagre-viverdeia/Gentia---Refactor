
import { Type, FileText, Settings, Globe, Calendar } from "lucide-react";
import { formatBRT } from "@/lib/datetime";

interface AgentDetailsSidebarProps {
  agent: {
    name: string;
    description?: string;
    type: "structured" | "adaptive";
    language: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

export const AgentDetailsSidebar = ({ agent }: AgentDetailsSidebarProps) => {
  const languageLabels: Record<string, string> = {
    "pt-BR": "Português (Brasil)",
    en: "Inglês",
    es: "Espanhol",
    fr: "Francês",
    de: "Alemão",
  };

  const typeLabels: Record<string, string> = {
    structured: "Estruturado",
    adaptive: "Adaptativo",
  };

  return (
    <div className="w-64 border-r bg-muted/20 p-6 space-y-6">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Detalhes do Agente
      </h3>

      <div className="space-y-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Type className="h-4 w-4" />
            <span className="text-xs font-medium">Nome</span>
          </div>
          <p className="text-sm font-medium pl-6">{agent.name}</p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span className="text-xs font-medium">Descrição</span>
          </div>
          <p className="text-sm text-muted-foreground pl-6">
            {agent.description || "Nenhuma descrição fornecida"}
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Settings className="h-4 w-4" />
            <span className="text-xs font-medium">Tipo</span>
          </div>
          <p className="text-sm font-medium pl-6">{typeLabels[agent.type]}</p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span className="text-xs font-medium">Idioma</span>
          </div>
          <p className="text-sm font-medium pl-6">
            {languageLabels[agent.language] || agent.language}
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-xs font-medium">Criado em</span>
          </div>
          <p className="text-sm font-medium pl-6">
            {formatBRT(agent.createdAt, "dd/MM/yyyy")}
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-xs font-medium">Última Atualização</span>
          </div>
          <p className="text-sm font-medium pl-6">
            {formatBRT(agent.updatedAt, "dd/MM/yyyy")}
          </p>
        </div>
      </div>
    </div>
  );
};
