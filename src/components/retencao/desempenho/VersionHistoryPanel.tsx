;
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RotateCcw, Clock } from 'lucide-react';
import type { PerformanceAssessmentVersionHistory } from '@/types/performance-assessment.types';
import { formatBRT } from "@/lib/datetime";

interface VersionHistoryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versions: PerformanceAssessmentVersionHistory[];
  onRestore: (version: PerformanceAssessmentVersionHistory) => void;
}

export function VersionHistoryPanel({
  open,
  onOpenChange,
  versions,
  onRestore,
}: VersionHistoryPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Versões
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-4">
          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma versão salva ainda
            </p>
          ) : (
            <div className="space-y-3">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="p-3 border rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {formatBRT(new Date(version.created_at), "dd/MM/yyyy 'às' HH:mm")}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onRestore(version);
                        onOpenChange(false);
                      }}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Restaurar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {version.snapshot.points.length} pessoa(s) avaliada(s)
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
