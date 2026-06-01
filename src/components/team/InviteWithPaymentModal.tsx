import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, Mail, Loader2, AlertCircle } from 'lucide-react';
import { AccountRole, roleLabels } from '@/types/account.types';
import { useTeamInvites } from '@/hooks/useTeamInvites';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface InviteWithPaymentModalProps {
  open: boolean;
  onClose: () => void;
  accountId: string;
  seatPrice?: number; // Price in BRL
}

export function InviteWithPaymentModal({ 
  open, 
  onClose, 
  accountId,
  seatPrice = 19.90 
}: InviteWithPaymentModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AccountRole>('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { sendInviteWithPayment } = useTeamInvites(accountId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    const result = await sendInviteWithPayment(email.trim(), role);

    if (result.success && result.checkoutUrl) {
      // Open Stripe Checkout in new tab
      window.open(result.checkoutUrl, '_blank');
      onClose();
      setEmail('');
      setRole('member');
    } else {
      setError(result.message || 'Erro ao criar convite');
    }

    setLoading(false);
  };

  const handleClose = () => {
    if (!loading) {
      setEmail('');
      setRole('member');
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Adicionar Novo Membro
          </DialogTitle>
          <DialogDescription>
            Adicione um novo membro à sua equipe. O valor será cobrado pro-rata até o fim do ciclo atual.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Price Info Card */}
            <Card className="bg-muted/50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Custo adicional</p>
                    <p className="text-xs text-muted-foreground">
                      Cobrado pro-rata agora + R$ {seatPrice.toFixed(2)}/mês
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">R$ {seatPrice.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">/mês</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email do novo membro</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {/* Role Select */}
            <div className="space-y-2">
              <Label htmlFor="invite-role">Cargo</Label>
              <Select 
                value={role} 
                onValueChange={(v) => setRole(v as AccountRole)}
                disabled={loading}
              >
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Administrador</span>
                      <span className="text-xs text-muted-foreground">Gerencia toda a conta</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin_rh">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Admin RH</span>
                      <span className="text-xs text-muted-foreground">Gerencia Pulse e colaboradores</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="leader">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Líder</span>
                      <span className="text-xs text-muted-foreground">Gerencia sua equipe</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="member">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Membro</span>
                      <span className="text-xs text-muted-foreground">Acesso padrão</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Visualizador</span>
                      <span className="text-xs text-muted-foreground">Apenas visualização</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Info Note */}
            <p className="text-xs text-muted-foreground">
              Após o pagamento, o convite será enviado automaticamente por email para {email || 'o novo membro'}.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !email.trim()}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Pagar e Enviar Convite
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}