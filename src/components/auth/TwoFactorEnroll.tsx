import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { BackupCodesDisplay } from "./BackupCodesDisplay";
import { useTwoFactor } from "@/hooks/useTwoFactor";
import { toast } from "@/hooks/use-toast";
import { Loader2, Smartphone, ShieldCheck } from "lucide-react";

interface TwoFactorEnrollProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type Step = "qrcode" | "verify" | "backup";

export const TwoFactorEnroll = ({ open, onOpenChange, onSuccess }: TwoFactorEnrollProps) => {
  const { enrollFactor, verifyFactor, generateBackupCodes, saveBackupCodes } = useTwoFactor();
  
  const [step, setStep] = useState<Step>("qrcode");
  const [loading, setLoading] = useState(false);
  const [enrollData, setEnrollData] = useState<{
    id: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const handleStartEnroll = async () => {
    try {
      setLoading(true);
      const data = await enrollFactor();
      
      if (data) {
        setEnrollData({
          id: data.id,
          qrCode: data.totp.qr_code,
          secret: data.totp.secret,
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao iniciar configuração",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!enrollData || code.length !== 6) return;

    try {
      setLoading(true);
      await verifyFactor(enrollData.id, code);
      
      // Generate and save backup codes
      const codes = generateBackupCodes();
      await saveBackupCodes(codes);
      setBackupCodes(codes);
      
      setStep("backup");
      
      toast({
        title: "2FA ativado com sucesso!",
        description: "Agora salve seus códigos de backup.",
      });
    } catch (error: any) {
      toast({
        title: "Código inválido",
        description: "Verifique o código e tente novamente.",
        variant: "destructive",
      });
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    onOpenChange(false);
    onSuccess?.();
    // Reset state
    setStep("qrcode");
    setEnrollData(null);
    setCode("");
    setBackupCodes([]);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && step === "backup") {
      // Don't allow closing during backup codes display without confirmation
      return;
    }
    onOpenChange(newOpen);
    if (!newOpen) {
      setStep("qrcode");
      setEnrollData(null);
      setCode("");
      setBackupCodes([]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Ativar Autenticação em Duas Etapas
          </DialogTitle>
          <DialogDescription>
            {step === "qrcode" && "Configure seu aplicativo autenticador"}
            {step === "verify" && "Digite o código do seu aplicativo"}
            {step === "backup" && "Salve seus códigos de backup"}
          </DialogDescription>
        </DialogHeader>

        {step === "qrcode" && (
          <div className="space-y-4">
            {!enrollData ? (
              <div className="text-center space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <Smartphone className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Você precisará de um aplicativo autenticador como Google Authenticator, Authy ou Microsoft Authenticator.
                  </p>
                </div>
                <Button onClick={handleStartEnroll} disabled={loading} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Começar Configuração
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Escaneie o QR Code com seu aplicativo autenticador:
                  </p>
                  <div className="flex justify-center">
                    <img
                      src={enrollData.qrCode}
                      alt="QR Code para 2FA"
                      className="w-48 h-48 border rounded-lg"
                    />
                  </div>
                </div>
                
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">
                    Ou digite o código manualmente:
                  </p>
                  <code className="text-xs bg-muted px-2 py-1 rounded break-all">
                    {enrollData.secret}
                  </code>
                </div>

                <Button onClick={() => setStep("verify")} className="w-full">
                  Próximo
                </Button>
              </div>
            )}
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Digite o código de 6 dígitos do seu aplicativo autenticador:
            </p>
            
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(value) => setCode(value)}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("qrcode")} className="flex-1">
                Voltar
              </Button>
              <Button 
                onClick={handleVerify} 
                disabled={code.length !== 6 || loading}
                className="flex-1"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verificar
              </Button>
            </div>
          </div>
        )}

        {step === "backup" && (
          <BackupCodesDisplay codes={backupCodes} onConfirm={handleComplete} />
        )}
      </DialogContent>
    </Dialog>
  );
};
