import { motion } from "framer-motion";
import { Rocket, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EvolutionEmptyStateProps {
  hasFilters: boolean;
  onCreateNew: () => void;
  onClearFilters: () => void;
}

export function EvolutionEmptyState({
  hasFilters,
  onCreateNew,
  onClearFilters,
}: EvolutionEmptyStateProps) {
  if (hasFilters) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="p-4 rounded-full bg-muted mb-4">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">
          Nenhum ciclo encontrado
        </h3>
        <p className="text-muted-foreground mb-4 max-w-md">
          Não encontramos ciclos de evolução com os filtros aplicados.
        </p>
        <Button variant="outline" onClick={onClearFilters}>
          Limpar filtros
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="p-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mb-6">
        <Rocket className="h-12 w-12 text-primary" />
      </div>
      <h3 className="text-2xl font-bold mb-2">
        Comece a evolução da sua equipe
      </h3>
      <p className="text-muted-foreground mb-6 max-w-lg">
        Crie ciclos de evolução baseados no Método 3P: Propósito, Progresso e Performance.
        Desenvolva pessoas com foco em resultados mensuráveis.
      </p>
      <Button size="lg" onClick={onCreateNew} className="gap-2">
        <Plus className="h-5 w-5" />
        Criar primeiro ciclo
      </Button>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12 max-w-3xl">
        <div className="text-center">
          <div className="p-3 rounded-lg bg-primary/10 w-fit mx-auto mb-3">
            <span className="text-2xl">🎯</span>
          </div>
          <h4 className="font-semibold mb-1">Propósito</h4>
          <p className="text-sm text-muted-foreground">
            Defina competências prioritárias com justificativa estratégica
          </p>
        </div>
        <div className="text-center">
          <div className="p-3 rounded-lg bg-primary/10 w-fit mx-auto mb-3">
            <span className="text-2xl">📈</span>
          </div>
          <h4 className="font-semibold mb-1">Progresso</h4>
          <p className="text-sm text-muted-foreground">
            Objetivos claros com comportamentos observáveis
          </p>
        </div>
        <div className="text-center">
          <div className="p-3 rounded-lg bg-primary/10 w-fit mx-auto mb-3">
            <span className="text-2xl">⚡</span>
          </div>
          <h4 className="font-semibold mb-1">Performance</h4>
          <p className="text-sm text-muted-foreground">
            Ações práticas ligadas a projetos reais
          </p>
        </div>
      </div>
    </motion.div>
  );
}
