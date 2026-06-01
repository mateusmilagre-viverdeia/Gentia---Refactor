import { useState } from "react";
import type { EvolutionCycle } from "@/types/evolution.types";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Plus, 
  Rocket, 
  Target, 
  TrendingUp, 
  Calendar,
  User,
  Filter,
  Search
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useEvolutionCycles } from "@/hooks/useEvolutionCycles";
import { EvolutionCycleCard } from "@/components/evolucao/EvolutionCycleCard";
import { EvolutionEmptyState } from "@/components/evolucao/EvolutionEmptyState";
import { EvolutionMetricsCards } from "@/components/evolucao/EvolutionMetricsCards";
import type { EvolutionCycleStatus } from "@/types/evolution.types";

const EvolutionHub = () => {
  const navigate = useNavigate();
  const { cycles, isLoading } = useEvolutionCycles();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<EvolutionCycleStatus | "all">("all");

  // Helper to get full name from cycle collaborator
  const getCollaboratorName = (cycle: EvolutionCycle): string => {
    if (!cycle.collaborator) return "Não definido";
    return `${cycle.collaborator.first_name || ""} ${cycle.collaborator.last_name || ""}`.trim() || "Sem nome";
  };

  const filteredCycles = cycles.filter((cycle) => {
    const collaboratorName = getCollaboratorName(cycle);
    const matchesSearch = collaboratorName
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || cycle.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCycles = cycles.filter((c) => c.status === "active");
  const completedCycles = cycles.filter((c) => c.status === "completed");
  const draftCycles = cycles.filter((c) => c.status === "draft");

  return (
    <AppLayout 
      title="Sistema de Evolução" 
      breadcrumb={[
        { label: "Retenção", href: "/retencao" },
        { label: "Sistema de Evolução" }
      ]}
    >
      <div className="space-y-6">
        {/* Header com mensagem de posicionamento */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Rocket className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Sistema de Evolução</h1>
              <p className="text-muted-foreground">
                Desenvolvimento contínuo orientado a resultado, performance e impacto no negócio
              </p>
            </div>
          </div>

          {/* Banner de posicionamento */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl p-4">
            <p className="text-sm font-medium text-primary">
              💡 Não é um plano de desenvolvimento. É um <strong>Sistema de Evolução</strong> com impacto mensurável em performance, comportamento e resultado.
            </p>
          </div>
        </motion.div>

        {/* Métricas */}
        <EvolutionMetricsCards
          totalCycles={cycles.length}
          activeCycles={activeCycles.length}
          completedCycles={completedCycles.length}
          draftCycles={draftCycles.length}
        />

        {/* Filtros e Ações */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-1 gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar colaborador..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select 
              value={statusFilter} 
              onValueChange={(v) => setStatusFilter(v as EvolutionCycleStatus | "all")}
            >
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="draft">Rascunhos</SelectItem>
                <SelectItem value="completed">Concluídos</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={() => navigate("/retencao/evolucao/novo")}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Novo Ciclo de Evolução
          </Button>
        </div>

        {/* Lista de Ciclos */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-48 rounded-xl bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : filteredCycles.length === 0 ? (
          <EvolutionEmptyState
            hasFilters={searchQuery !== "" || statusFilter !== "all"}
            onCreateNew={() => navigate("/retencao/evolucao/novo")}
            onClearFilters={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {filteredCycles.map((cycle, index) => (
              <motion.div
                key={cycle.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <EvolutionCycleCard
                  cycle={cycle}
                  onClick={() => navigate(`/retencao/evolucao/${cycle.id}`)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

export default EvolutionHub;
