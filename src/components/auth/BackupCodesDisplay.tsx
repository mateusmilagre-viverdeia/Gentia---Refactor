import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, Download, Check, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface BackupCodesDisplayProps {
  codes: string[];
  onConfirm?: () => void;
}

export const BackupCodesDisplay = ({ codes, onConfirm }: BackupCodesDisplayProps) => {
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
      toast({
        title: "Códigos copiados",
        description: "Os códigos foram copiados para a área de transferência.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar os códigos.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    const content = `CÓDIGOS DE BACKUP - 2FA\n\nGuarde estes códigos em local seguro.\nCada código só pode ser usado uma vez.\n\n${codes.join("\n")}\n\nGerado em: ${new Date().toLocaleString("pt-BR")}`;
    
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "codigos-backup-2fa.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download iniciado",
      description: "O arquivo com os códigos está sendo baixado.",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-amber-500">Guarde estes códigos em local seguro!</p>
          <p className="text-muted-foreground mt-1">
            Cada código só pode ser usado uma vez. Use-os se perder acesso ao seu aplicativo autenticador.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-2">
            {codes.map((code, index) => (
              <div
                key={index}
                className="font-mono text-sm bg-muted px-3 py-2 rounded text-center"
              >
                {code}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={handleCopy}>
          {copied ? (
            <Check className="h-4 w-4 mr-2" />
          ) : (
            <Copy className="h-4 w-4 mr-2" />
          )}
          {copied ? "Copiado!" : "Copiar todos"}
        </Button>
        <Button variant="outline" className="flex-1" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download .txt
        </Button>
      </div>

      {onConfirm && (
        <div className="pt-4 border-t">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="rounded border-input"
            />
            <span className="text-sm">
              Salvei meus códigos de backup em local seguro
            </span>
          </label>
          <Button
            className="w-full mt-3"
            disabled={!confirmed}
            onClick={onConfirm}
          >
            Concluir Configuração
          </Button>
        </div>
      )}
    </div>
  );
};
