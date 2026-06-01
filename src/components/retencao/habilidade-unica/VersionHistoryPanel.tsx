
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, RotateCcw } from 'lucide-react';
import type { UniqueAbilityVersionHistory } from '@/types/unique-ability.types';
import { formatBRT } from "@/lib/datetime";

interface VersionHistoryPanelProps {
  versions: UniqueAbilityVersionHistory[];
  onRestore: (version: UniqueAbilityVersionHistory) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VersionHistoryPanel({
  versions,
  onRestore,
  open,
  onOpenChange
}: VersionHistoryPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="h-4 w-4 mr-2" />
          Histórico ({versions.length})
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px]">
        <SheetHeader>
          <SheetTitle>Histórico de Versões</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-100px)] mt-4">
          {versions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma versão salva ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="p-4 border rounded-lg bg-card"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {formatBRT(new Date(version.created_at), "dd/MM/yyyy 'às' HH:mm")}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRestore(version)}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Restaurar
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {version.snapshot.activities.length} atividade(s)
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
