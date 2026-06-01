import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTwoFactor } from "@/hooks/useTwoFactor";
import { toast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, Key } from "lucide-react";

interface TwoFactorVerifyProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export const TwoFactorVerify = ({ onSuccess, onCancel }: TwoFactorVerifyProps) => {
  const { verifyMfaLogin, verifyBackupCode } = useTwoFactor();
  
  const [mode, setMode] = useState<"totp" | "backup">("totp");
  const [totpCode, setTotpCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerifyTotp = async () => {
    if (totpCode.length !== 6) return;

    try {
      setLoading(true);
      await verifyMfaLogin(totpCode);
      toast({
        title: "Verificação concluída",
        description: "Login realizado com sucesso!",
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Código inválido",
        description: "Verifique o código e tente novamente.",
        variant: "destructive",
      });
      setTotpCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyBackup = async () => {
    if (!backupCode.trim()) return;

    try {
      setLoading(true);
      const valid = await verifyBackupCode(backupCode.trim().toUpperCase());
      
      if (!valid) {
        toast({
          title: "Código inválido",
          description: "Este código não é válido ou já foi usado.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Verificação concluída",
        description: "Login realizado com sucesso!",
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro na verificação",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Verificação em Duas Etapas</CardTitle>
        <CardDescription>
          Digite o código para continuar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={mode} onValueChange={(v) => setMode(v as "totp" | "backup")}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="totp">Código do App</TabsTrigger>
            <TabsTrigger value="backup">Código de Backup</TabsTrigger>
          </TabsList>

          <TabsContent value="totp" className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Digite o código de 6 dígitos do seu aplicativo autenticador:
            </p>
            
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={totpCode}
                onChange={(value) => setTotpCode(value)}
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

            <Button 
              onClick={handleVerifyTotp} 
              disabled={totpCode.length !== 6 || loading}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verificar
            </Button>
          </TabsContent>

          <TabsContent value="backup" className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
              <Key className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Use um dos seus códigos de backup se não tiver acesso ao aplicativo autenticador. Cada código só pode ser usado uma vez.
              </p>
            </div>

            <div className="space-y-2">
              <Input
                placeholder="XXXXX-XXXXX"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                className="text-center font-mono"
              />
            </div>

            <Button 
              onClick={handleVerifyBackup} 
              disabled={!backupCode.trim() || loading}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verificar Código de Backup
            </Button>
          </TabsContent>
        </Tabs>

        {onCancel && (
          <Button variant="ghost" onClick={onCancel} className="w-full mt-4">
            Voltar ao Login
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
