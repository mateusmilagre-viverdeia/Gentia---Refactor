import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BookOpen, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAccount } from "@/hooks/useAccount";
import { useCultureCodeFile } from "@/hooks/useCultureCodeFile";
import { toast } from "sonner";
import { CultureImportPreview } from "./CultureImportPreview";

interface ExtractedCultureCode {
  missao: { statement: string };
  visao: { statement: string; horizon?: string };
  valores: { values: Array<{ label: string; mantra?: string; dos: string[]; donts: string[] }> };
  indicadores: { financeira: string[]; clientes: string[]; processos: string[]; aprendizado: string[] };
  projetos: Array<{ name: string; perspective: string; importance?: string }>;
  energia: { items: string[] };
  desenvolvimento: { items: string[] };
  decisao: { guidelines: string[]; summary?: string };
}

type ImportStep = "idle" | "processing" | "preview" | "saving" | "complete" | "error";

interface CultureCodeLibraryImporterProps {
  onImportComplete?: () => void;
  autoOpen?: boolean;
}

export function CultureCodeLibraryImporter({ onImportComplete, autoOpen = false }: CultureCodeLibraryImporterProps) {
  const [open, setOpen] = useState(autoOpen);
  const [step, setStep] = useState<ImportStep>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedCultureCode | null>(null);
  const [accountName, setAccountName] = useState("");
  const [saveResults, setSaveResults] = useState<Record<string, boolean> | null>(null);

  const { user } = useAuth();
  const { account } = useAccount();
  const { activeFile, getFileUrl } = useCultureCodeFile();

  const resetState = () => {
    setStep("idle");
    setProgress(0);
    setError(null);
    setExtractedData(null);
    setAccountName("");
    setSaveResults(null);
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(resetState, 300);
  };

  const handleStart = async () => {
    if (!account || !user || !activeFile) return;

    setStep("processing");
    setProgress(10);

    try {
      const fileUrl = getFileUrl(activeFile.file_path);
      setProgress(20);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Sessão expirada. Por favor, faça login novamente.");
      }

      setProgress(40);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-culture-pdf`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            fileUrl,
            accountId: account.id,
            previewOnly: true,
          }),
        }
      );

      setProgress(80);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Falha ao processar o PDF");
      }

      setProgress(100);
      setExtractedData(result.data);
      setAccountName(result.accountName);
      setStep("preview");
    } catch (err) {
      console.error("Error processing library PDF:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido ao processar o PDF");
      setStep("error");
    }
  };

  const handleConfirmImport = async () => {
    if (!account || !user || !extractedData) return;

    setStep("saving");
    setProgress(10);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Sessão expirada. Por favor, faça login novamente.");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-culture-pdf`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            accountId: account.id,
            previewOnly: false,
            extractedData,
          }),
        }
      );

      setProgress(80);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Falha ao salvar os dados");
      }

      setProgress(100);
      setSaveResults(result.results);
      setStep("complete");
      toast.success("Código de Cultura importado da Biblioteca com sucesso!");
      onImportComplete?.();
    } catch (err) {
      console.error("Error saving culture data:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido ao salvar os dados");
      setStep("error");
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && step === "idle") {
      handleStart();
    }
    if (!isOpen) {
      setTimeout(resetState, 300);
    }
  };

  if (!activeFile) return null;

  const renderContent = () => {
    switch (step) {
      case "idle":
      case "processing":
        return (
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-primary" />
              <div className="flex-1">
                <p className="font-medium">{activeFile.file_name}</p>
                <p className="text-sm text-muted-foreground">Extraindo pilares com IA...</p>
              </div>
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
            <Progress value={progress} className="h-2" />
            <div className="text-center text-sm text-muted-foreground">
              <p>Analisando o PDF da Biblioteca e identificando os 8 pilares...</p>
              <p className="mt-1">Isso pode levar até 30 segundos.</p>
            </div>
          </div>
        );

      case "preview":
        return extractedData ? (
          <CultureImportPreview
            data={extractedData}
            accountName={accountName}
            onConfirm={handleConfirmImport}
            onCancel={() => handleClose()}
          />
        ) : null;

      case "saving":
        return (
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-lg font-medium">Salvando dados...</p>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        );

      case "complete":
        return (
          <div className="space-y-6 py-4 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
            <div>
              <h3 className="text-xl font-semibold text-green-600">Importação Concluída!</h3>
              <p className="text-muted-foreground mt-2">
                O Código de Cultura foi importado da Biblioteca para <strong>{accountName}</strong>
              </p>
            </div>
            {saveResults && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(saveResults).map(([pillar, success]) => (
                  <div
                    key={pillar}
                    className={`flex items-center gap-2 p-2 rounded ${
                      success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                    }`}
                  >
                    {success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span className="capitalize">{pillar}</span>
                  </div>
                ))}
              </div>
            )}
            <Button onClick={handleClose} className="mt-4">Fechar</Button>
          </div>
        );

      case "error":
        return (
          <div className="space-y-6 py-4 text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-red-500" />
            <div>
              <h3 className="text-xl font-semibold text-red-600">Erro na Importação</h3>
              <p className="text-muted-foreground mt-2">{error}</p>
            </div>
            <Button onClick={() => { resetState(); handleStart(); }} variant="outline">
              Tentar Novamente
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button variant="outline" className="gap-2" onClick={() => handleOpenChange(true)}>
        <BookOpen className="w-4 h-4" />
        Importar da Biblioteca
      </Button>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar da Biblioteca</DialogTitle>
          <DialogDescription>
            Extraindo os 8 pilares do PDF "{activeFile.file_name}" já armazenado na Biblioteca.
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
