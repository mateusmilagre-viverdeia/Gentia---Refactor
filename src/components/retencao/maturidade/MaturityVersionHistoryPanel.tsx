;
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, RotateCcw } from 'lucide-react';
import type { TeamMaturityVersionHistory } from '@/types/team-maturity.types';
import { formatBRT } from "@/lib/datetime";

interface MaturityVersionHistoryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versions: TeamMaturityVersionHistory[];
  onRestore: (version: TeamMaturityVersionHistory) => void;
}

export function MaturityVersionHistoryPanel({
  open,
  onOpenChange,
  versions,
  onRestore,
}: MaturityVersionHistoryPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Versões
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-4">
          {versions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma versão salva</p>
              <p className="text-sm mt-1">
                Use "Salvar Versão" para criar um snapshot
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="p-3 border rounded-lg bg-muted/20"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">
                        {formatBRT(new Date(version.created_at), "dd/MM/yyyy 'às' HH:mm")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {version.snapshot.points.length} pessoa(s)
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onRestore(version);
                        onOpenChange(false);
                      }}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Restaurar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
