import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TwoFactorEnroll } from "./TwoFactorEnroll";
import { BackupCodesDisplay } from "./BackupCodesDisplay";
import { useTwoFactor } from "@/hooks/useTwoFactor";
import { toast } from "@/hooks/use-toast";
import { ShieldCheck, ShieldOff, Key, Loader2, RefreshCw } from "lucide-react";

export const TwoFactorSettings = () => {
  const { 
    isEnabled, 
    isLoading, 
    backupCodesCount, 
    unenrollFactor, 
    generateBackupCodes, 
    saveBackupCodes,
    getMfaStatus 
  } = useTwoFactor();

  const [showEnroll, setShowEnroll] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [showNewCodes, setShowNewCodes] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const [newBackupCodes, setNewBackupCodes] = useState<string[]>([]);

  const handleDisable = async () => {
    try {
      setDisabling(true);
      await unenrollFactor();
      setShowDisableConfirm(false);
      toast({
        title: "2FA desativado",
        description: "A autenticação em duas etapas foi desativada.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao desativar",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setDisabling(false);
    }
  };

  const handleGenerateNewCodes = async () => {
    try {
      setGeneratingCodes(true);
      const codes = generateBackupCodes();
      await saveBackupCodes(codes);
      setNewBackupCodes(codes);
      setShowNewCodes(true);
      toast({
        title: "Novos códigos gerados",
        description: "Seus códigos anteriores foram invalidados.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao gerar códigos",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setGeneratingCodes(false);
    }
  };

  const handleCloseNewCodes = () => {
    setShowNewCodes(false);
    setNewBackupCodes([]);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Autenticação em Duas Etapas (2FA)
              </CardTitle>
              <CardDescription>
                Adicione uma camada extra de segurança à sua conta
              </CardDescription>
            </div>
            {isEnabled ? (
              <Badge variant="default" className="bg-green-600">
                Ativo
              </Badge>
            ) : (
              <Badge variant="secondary">
                Inativo
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isEnabled ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Com a autenticação em duas etapas, você precisará inserir um código do seu aplicativo autenticador além da sua senha para fazer login.
              </p>
              <Button onClick={() => setShowEnroll(true)}>
                <ShieldCheck className="h-4 w-4 mr-2" />
                Ativar 2FA
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Key className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Códigos de Backup</p>
                    <p className="text-xs text-muted-foreground">
                      {backupCodesCount} código{backupCodesCount !== 1 ? "s" : ""} restante{backupCodesCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleGenerateNewCodes}
                  disabled={generatingCodes}
                >
                  {generatingCodes ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {generatingCodes ? "" : "Gerar Novos"}
                </Button>
              </div>

              <Button 
                variant="destructive" 
                onClick={() => setShowDisableConfirm(true)}
              >
                <ShieldOff className="h-4 w-4 mr-2" />
                Desativar 2FA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <TwoFactorEnroll 
        open={showEnroll} 
        onOpenChange={setShowEnroll}
        onSuccess={getMfaStatus}
      />

      <AlertDialog open={showDisableConfirm} onOpenChange={setShowDisableConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar 2FA?</AlertDialogTitle>
            <AlertDialogDescription>
              Sua conta ficará menos segura sem a autenticação em duas etapas. Todos os seus códigos de backup também serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisable}
              disabled={disabling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disabling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showNewCodes} onOpenChange={handleCloseNewCodes}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novos Códigos de Backup</DialogTitle>
            <DialogDescription>
              Seus códigos anteriores foram invalidados. Salve estes novos códigos.
            </DialogDescription>
          </DialogHeader>
          <BackupCodesDisplay codes={newBackupCodes} onConfirm={handleCloseNewCodes} />
        </DialogContent>
      </Dialog>
    </>
  );
};
