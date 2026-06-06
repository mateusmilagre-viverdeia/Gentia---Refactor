import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useDemoMode } from "@/hooks/useDemoMode";

/**
 * Faixa global "MODO DEMO" exibida abaixo do topbar quando a conta corrente
 * tem dados de demonstração ativos.
 */
export function DemoModeBadge() {
  const { isDemoActive } = useDemoMode();

  if (!isDemoActive) return null;

  return (
    <div
      className="print:hidden w-full border-b bg-warning/15 text-warning-foreground"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <span className="font-medium">MODO DEMO</span>
          <span className="text-muted-foreground hidden sm:inline">
            — Os dados exibidos são fictícios para demonstração.
          </span>
        </div>
        <Link
          to="/atracao-contratacao/recrutamento/configuracoes?tab=creditos"
          className="underline underline-offset-2 hover:opacity-80"
        >
          Limpar dados demo
        </Link>
      </div>
    </div>
  );
}
