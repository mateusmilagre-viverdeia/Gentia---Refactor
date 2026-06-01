import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAccount } from "@/hooks/useAccount";
import { toast } from "sonner";
import { CultureImportPreview } from "./CultureImportPreview";

interface ExtractedCultureCode {
  missao: {
    statement: string;
  };
  visao: {
    statement: string;
    horizon?: string;
  };
  valores: {
    values: Array<{
      label: string;
      mantra?: string;
      dos: string[];
      donts: string[];
    }>;
  };
  indicadores: {
    financeira: string[];
    clientes: string[];
    processos: string[];
    aprendizado: string[];
  };
  projetos: Array<{
    name: string;
    perspective: string;
    importance?: string;
  }>;
  energia: {
    items: string[];
  };
  desenvolvimento: {
    items: string[];
  };
  decisao: {
    guidelines: string[];
    summary?: string;
  };
}

type ImportStep = "upload" | "processing" | "preview" | "saving" | "complete" | "error";

interface CultureCodeImporterProps {
  onImportComplete?: () => void;
}

export function CultureCodeImporter({ onImportComplete }: CultureCodeImporterProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<ImportStep>("upload");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedCultureCode | null>(null);
  const [accountName, setAccountName] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [saveResults, setSaveResults] = useState<Record<string, boolean> | null>(null);

  const { user } = useAuth();
  const { account } = useAccount();

  const resetState = () => {
    setStep("upload");
    setProgress(0);
    setError(null);
    setExtractedData(null);
    setAccountName("");
    setFileName("");
    setSaveResults(null);
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(resetState, 300);
  };

  const processFile = async (file: File) => {
    if (!account) {
      setError("Nenhuma empresa selecionada. Por favor, selecione uma empresa primeiro.");
      setStep("error");
      return;
    }

    if (!user) {
      setError("Usuário não autenticado.");
      setStep("error");
      return;
    }

    setFileName(file.name);
    setStep("processing");
    setProgress(10);

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix
          const base64Data = result.split(",")[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setProgress(30);

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Sessão expirada. Por favor, faça login novamente.");
      }

      setProgress(40);

      // Call edge function for preview
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-culture-pdf`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            pdfBase64: base64,
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
      console.error("Error processing PDF:", err);
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

      // Convert extractedData back to base64 is not needed since we're sending the data directly
      // We'll call the edge function again but this time with previewOnly: false
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-culture-pdf`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            pdfBase64: "skip", // We'll need to re-upload or cache
            accountId: account.id,
            previewOnly: false,
            extractedData, // Send the already extracted data
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

      toast.success("Código de Cultura importado com sucesso!");
      onImportComplete?.();
    } catch (err) {
      console.error("Error saving culture data:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido ao salvar os dados");
      setStep("error");
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("O arquivo deve ter no máximo 10MB");
        setStep("error");
        return;
      }
      processFile(file);
    }
  }, [account, user]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
  });

  const renderContent = () => {
    switch (step) {
      case "upload":
        return (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Faça upload do PDF do Código de Cultura do cliente. O sistema irá extrair
                automaticamente as informações dos 8 pilares.
              </AlertDescription>
            </Alert>

            {account ? (
              <div className="text-sm text-muted-foreground">
                Importando para: <strong>{account.name}</strong>
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Nenhuma empresa selecionada. Por favor, selecione uma empresa primeiro.
                </AlertDescription>
              </Alert>
            )}

            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors duration-200
                ${isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
                }
                ${!account ? "opacity-50 pointer-events-none" : ""}
              `}
            >
              <input {...getInputProps()} disabled={!account} />
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-lg font-medium">Solte o arquivo aqui...</p>
              ) : (
                <>
                  <p className="text-lg font-medium">Arraste o PDF aqui</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    ou clique para selecionar um arquivo
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Máximo 10MB • Apenas arquivos PDF
                  </p>
                </>
              )}
            </div>
          </div>
        );

      case "processing":
        return (
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              <div className="flex-1">
                <p className="font-medium">{fileName}</p>
                <p className="text-sm text-muted-foreground">Processando com IA...</p>
              </div>
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>

            <Progress value={progress} className="h-2" />

            <div className="text-center text-sm text-muted-foreground">
              <p>Extraindo informações dos 8 pilares do Código de Cultura...</p>
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
            onCancel={() => setStep("upload")}
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
                O Código de Cultura foi importado para <strong>{accountName}</strong>
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
                    {success ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span className="capitalize">{pillar}</span>
                  </div>
                ))}
              </div>
            )}

            <Button onClick={handleClose} className="mt-4">
              Fechar
            </Button>
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
            <Button onClick={resetState} variant="outline">
              Tentar Novamente
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="w-4 h-4" />
          Importar PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Código de Cultura</DialogTitle>
          <DialogDescription>
            Faça upload de um PDF de Código de Cultura para preencher automaticamente os 8 pilares.
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
