import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Minus,
  X,
  ExternalLink,
  Sparkles,
  MousePointerClick,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSalesDemo } from "./SalesDemoProvider";
import { BLOCKS, OBJECTIONS } from "./salesDemoConfig";
import { SalesDemoCloseModal } from "./SalesDemoCloseModal";

export function SalesDemoBottomBar() {
  const demo = useSalesDemo();
  const navigate = useNavigate();
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [manualDone, setManualDone] = useState(false);

  const block = BLOCKS.find((b) => b.id === demo.currentBlock) ?? BLOCKS[0];
  const blockIndex = BLOCKS.findIndex((b) => b.id === block.id);

  // Reset do "aguardando clique" ao trocar de bloco
  useEffect(() => {
    setManualDone(false);
  }, [block.id]);

  // Intercepta clique no elemento âncora para liberar o avanço manual
  useEffect(() => {
    if (block.advanceMode !== "manual_click" || !block.anchor) return;
    const handler = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest(`[data-demo-anchor="${block.anchor}"]`)) {
        setManualDone(true);
      }
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [block.advanceMode, block.anchor]);

  const handleNext = () => {
    if (demo.isLast) {
      setCloseModalOpen(true);
      return;
    }
    const next = BLOCKS[blockIndex + 1];
    if (next?.route) navigate(next.route);
    demo.next();
  };

  const handlePrev = () => {
    const prev = BLOCKS[blockIndex - 1];
    if (prev?.route) navigate(prev.route);
    demo.prev();
  };

  const canAdvance =
    block.advanceMode === "auto" || manualDone || demo.isLast;

  return (
    <>
      <aside
        className="fixed inset-x-0 bottom-0 z-[9999] border-t bg-background/95 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-background/80"
        role="region"
        aria-label="Demo guiada"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
          {/* Esquerda: badge + título */}
          <div className="flex min-w-0 items-center gap-2">
            <Badge className="bg-amber-600 text-white hover:bg-amber-600">
              Demo · {blockIndex + 1}/{BLOCKS.length}
            </Badge>
            <span className="hidden truncate text-sm font-semibold sm:inline">
              {block.title}
            </span>
          </div>

          {/* Centro: narrativa */}
          <div className="flex-1 min-w-0">
            {block.highlight && (
              <div className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                <Sparkles className="h-3 w-3" />
                {block.highlight}
              </div>
            )}
            <p className="truncate text-sm text-foreground sm:whitespace-normal sm:line-clamp-2">
              {block.narrative}
            </p>
            {block.advanceMode === "manual_click" && !manualDone && (
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <MousePointerClick className="h-3 w-3" />
                {block.manualHint ?? "Clique no elemento destacado"}
              </div>
            )}
          </div>

          {/* Ações de rota externa (ex.: portal) */}
          {block.externalRoute && (
            <Button
              variant="outline"
              size="sm"
              className="hidden gap-1.5 md:inline-flex"
              onClick={() =>
                window.open(block.externalRoute!, "_blank", "noopener")
              }
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {block.routeLabel ?? "Abrir"}
            </Button>
          )}

          {/* Progresso */}
          <div className="hidden items-center gap-1 md:flex">
            {BLOCKS.map((b, i) => {
              const done = i < blockIndex;
              const current = i === blockIndex;
              return (
                <div
                  key={b.id}
                  className="h-1.5 w-5 rounded-full transition-colors"
                  style={{
                    backgroundColor: current
                      ? "#D97706"
                      : done
                        ? "#15803D"
                        : "hsl(var(--muted))",
                  }}
                />
              );
            })}
          </div>

          {/* Navegação */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              disabled={demo.isFirst}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Anterior</span>
            </Button>
            <Button
              size="sm"
              onClick={handleNext}
              disabled={!canAdvance}
              className="gap-1 bg-foreground text-background hover:bg-foreground/90"
            >
              <span className="hidden sm:inline">
                {demo.isLast ? "Encerrar" : "Próximo"}
              </span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Ajuda (objeções) */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" title="Ajuda · objeções">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              side="top"
              className="z-[10001] w-80 p-0"
            >
              <ObjectionsList />
            </PopoverContent>
          </Popover>

          {/* Minimizar / fechar */}
          <Button
            variant="ghost"
            size="icon"
            title="Minimizar"
            onClick={() => demo.setMinimized(true)}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Fechar"
            onClick={() => {
              if (
                confirm(
                  "Encerrar e fechar a Demo Guiada? O progresso será mantido.",
                )
              ) {
                demo.closePanel();
              }
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </aside>

      <SalesDemoCloseModal
        open={closeModalOpen}
        onOpenChange={setCloseModalOpen}
      />
    </>
  );
}

function ObjectionsList() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="max-h-96 overflow-y-auto p-2">
      <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Objeções comuns
      </div>
      <div className="space-y-1">
        {OBJECTIONS.map((o) => {
          const isOpen = open === o.key;
          return (
            <div key={o.key}>
              <button
                onClick={() => setOpen(isOpen ? null : o.key)}
                className="w-full rounded-md px-2 py-1.5 text-left text-sm font-medium hover:bg-muted"
              >
                {o.label}
              </button>
              {isOpen && (
                <p className="mx-1 mb-1 mt-0.5 rounded-md bg-muted/60 px-2 py-1.5 text-xs leading-relaxed text-muted-foreground">
                  {o.answer}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
