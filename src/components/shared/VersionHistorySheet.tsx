import { useState } from "react";

import { History, RotateCcw, Save, Trash2, Tag } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { ModuleVersion, VersionTrigger } from "@/hooks/useVersionHistory";
import { formatBRT } from "@/lib/datetime";

interface Props {
  versions: ModuleVersion[];
  loading?: boolean;
  saving?: boolean;
  onSave: (trigger: VersionTrigger, label?: string) => void | Promise<void>;
  onRestore: (id: string) => void | Promise<void>;
  onRemove?: (id: string) => void | Promise<void>;
  triggerLabel?: string;
}

const triggerLabels: Record<VersionTrigger, string> = {
  manual: "Manual",
  auto_stage: "Automática",
  auto_save: "Auto-salvo",
  pre_restore: "Pré-restauração",
};

export function VersionHistorySheet({
  versions, loading, saving, onSave, onRestore, onRemove, triggerLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");

  const handleSave = async () => {
    await onSave("manual", label.trim() || undefined);
    setLabel("");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          {triggerLabel ?? "Histórico"}
          {versions.length > 0 && (
            <Badge variant="secondary" className="ml-1">{versions.length}</Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" /> Histórico de versões
          </SheetTitle>
        </SheetHeader>

        <div className="flex gap-2 mt-4">
          <Input
            placeholder="Rótulo (opcional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
            <Save className="h-4 w-4" /> Salvar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Ao restaurar, salvamos automaticamente um snapshot do estado atual.
        </p>

        <ScrollArea className="flex-1 mt-4 -mx-6 px-6">
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Carregando…</p>
          ) : versions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhuma versão salva ainda.
            </p>
          ) : (
            <div className="space-y-2 pb-6">
              {versions.map((v) => {
                const counts = v.summary?.counts ?? {};
                const countsStr = Object.entries(counts)
                  .map(([k, n]) => `${n} ${k}`)
                  .join(" • ");
                return (
                  <div key={v.id} className="border rounded-lg p-3 space-y-2 bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">
                          {formatBRT(new Date(v.created_at), "dd/MM/yyyy 'às' HH:mm")}
                        </div>
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {triggerLabels[v.trigger_type] ?? v.trigger_type}
                          </Badge>
                          {v.label && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Tag className="h-3 w-3" /> {v.label}
                            </Badge>
                          )}
                        </div>
                        {countsStr && (
                          <p className="text-xs text-muted-foreground mt-1">{countsStr}</p>
                        )}
                        {v.summary?.description && (
                          <p className="text-xs text-muted-foreground mt-1">{v.summary.description}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="gap-1">
                              <RotateCcw className="h-3 w-3" /> Restaurar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Restaurar esta versão?</AlertDialogTitle>
                              <AlertDialogDescription>
                                O estado atual será substituído. Salvamos automaticamente
                                um snapshot do que está agora antes de restaurar.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => { onRestore(v.id); setOpen(false); }}>
                                Restaurar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        {onRemove && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 text-destructive hover:text-destructive"
                            onClick={() => onRemove(v.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
