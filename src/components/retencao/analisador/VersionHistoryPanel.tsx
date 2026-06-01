;
import { History, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { PeopleAnalysisVersionHistory } from "@/types/people-analysis.types";
import { formatBRT } from "@/lib/datetime";

interface VersionHistoryPanelProps {
  versionHistory: PeopleAnalysisVersionHistory[];
  onRestore: (version: PeopleAnalysisVersionHistory) => void;
}

export function VersionHistoryPanel({ versionHistory, onRestore }: VersionHistoryPanelProps) {
  if (versionHistory.length === 0) {
    return null;
  }

  return (
    <Accordion type="single" collapsible className="mt-4">
      <AccordionItem value="history" className="border rounded-lg">
        <AccordionTrigger className="px-4 hover:no-underline">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span>Histórico de Versões ({versionHistory.length})</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <div className="space-y-2">
            {versionHistory.map((version) => {
              const snapshot = version.snapshot as {
                members?: { name: string }[];
                ratings?: unknown[];
              };
              const memberCount = snapshot?.members?.length || 0;
              const ratingCount = snapshot?.ratings?.length || 0;

              return (
                <div
                  key={version.id}
                  className="flex items-center justify-between p-3 border rounded-md bg-muted/30"
                >
                  <div>
                    <div className="font-medium text-sm">
                      {formatBRT(new Date(version.created_at), "dd/MM/yyyy 'às' HH:mm")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {memberCount} pessoas • {ratingCount} avaliações
                    </div>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Restaurar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Restaurar versão?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Isso substituirá os dados atuais pela versão de{" "}
                          {formatBRT(new Date(version.created_at), "dd/MM/yyyy 'às' HH:mm")}
                          . Você pode salvar a versão atual antes de restaurar.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onRestore(version)}>
                          Restaurar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              );
            })}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
