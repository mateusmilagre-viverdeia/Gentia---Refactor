import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link2, Copy, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type TestType = "cultural" | "disc" | "technical";

interface GenerateTestLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateName: string;
  jobId: string;
  accountId: string;
}

const TEST_OPTIONS: { value: TestType; label: string }[] = [
  { value: "cultural", label: "Fit Cultural" },
  { value: "disc", label: "Fit Comportamental (DISC)" },
  { value: "technical", label: "Fit Técnico" },
];

export function GenerateTestLinkDialog({
  open,
  onOpenChange,
  candidateId,
  candidateName,
  jobId,
  accountId,
}: GenerateTestLinkDialogProps) {
  const [testType, setTestType] = useState<TestType | "">("");
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!testType) {
      toast.error("Selecione o tipo de teste");
      return;
    }

    setIsGenerating(true);
    setGeneratedUrl(null);

    try {
      let functionName: string;
      let body: Record<string, unknown>;

      switch (testType) {
        case "cultural":
          functionName = "send-interview-invite";
          body = {
            candidate_id: candidateId,
            job_id: jobId,
            skip_notifications: true,
          };
          break;
        case "disc":
          functionName = "send-disc-invitation";
          body = {
            candidateId,
            jobId,
            accountId,
            skip_notifications: true,
          };
          break;
        case "technical":
          functionName = "send-technical-invitation";
          body = {
            candidateId,
            jobId,
            accountId,
            skip_notifications: true,
          };
          break;
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body,
      });

      if (error) throw error;

      if (data?.sessionUrl) {
        setGeneratedUrl(data.sessionUrl);
        toast.success("Link gerado com sucesso!");
      } else {
        throw new Error(data?.error || "Não foi possível gerar o link");
      }
    } catch (err: any) {
      console.error("Error generating test link:", err);
      toast.error(err.message || "Erro ao gerar link do teste");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedUrl) return;
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar link");
    }
  };

  const handleClose = (value: boolean) => {
    if (!value) {
      setTestType("");
      setGeneratedUrl(null);
      setCopied(false);
    }
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Gerar Link de Teste
          </DialogTitle>
          <DialogDescription>
            Gere um link manual para <strong>{candidateName}</strong> realizar um teste.
            O link já estará vinculado ao candidato.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Tipo de Teste</Label>
            <Select
              value={testType}
              onValueChange={(v) => {
                setTestType(v as TestType);
                setGeneratedUrl(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o teste..." />
              </SelectTrigger>
              <SelectContent>
                {TEST_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!generatedUrl ? (
            <Button
              onClick={handleGenerate}
              disabled={!testType || isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-2" />
                  Gerar Link
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-2">
              <Label>Link Gerado</Label>
              <div className="flex gap-2">
                <Input value={generatedUrl} readOnly className="text-xs" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Copie e envie este link para o candidato. Ele já está vinculado ao perfil de{" "}
                {candidateName}.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
