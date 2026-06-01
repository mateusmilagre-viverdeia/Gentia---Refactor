import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gift, Loader2, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface Account {
  id: string;
  name: string;
}

interface GrantCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function GrantCreditsModal({ open, onOpenChange, onSuccess }: GrantCreditsModalProps) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountSearch, setAccountSearch] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [amount, setAmount] = useState(10);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingAccounts(true);
    supabase
      .from('companies')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        setAccounts(data || []);
        setLoadingAccounts(false);
      });
  }, [open]);

  const filteredAccounts = useMemo(() => {
    if (!accountSearch.trim()) return accounts;
    const q = accountSearch.toLowerCase();
    return accounts.filter(a => a.name.toLowerCase().includes(q));
  }, [accounts, accountSearch]);

  const selectedAccountName = accounts.find(a => a.id === selectedAccountId)?.name;

  const handleGrant = async () => {
    if (!selectedAccountId || !reason.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('add_credits', {
        p_account_id: selectedAccountId,
        p_credit_type: 'universal',
        p_amount: amount,
        p_operation: 'admin_grant',
        p_description: reason.trim(),
        p_user_id: user?.id ?? null,
      });

      if (error) throw error;

      const result = data as unknown as { success: boolean; balance_after: number };
      if (result?.success) {
        toast({
          title: 'Créditos concedidos',
          description: `+${amount} créditos para ${selectedAccountName}. Novo saldo: ${result.balance_after}`,
        });
        onOpenChange(false);
        setReason('');
        setAmount(10);
        setSelectedAccountId('');
        setAccountSearch('');
        onSuccess?.();
      }
    } catch (err: any) {
      toast({ title: 'Erro ao conceder créditos', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Conceder Créditos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              Empresa *
            </Label>
            <Input
              placeholder="Buscar empresa..."
              value={accountSearch}
              onChange={(e) => setAccountSearch(e.target.value)}
              className="mb-1"
            />
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger>
                <SelectValue placeholder={loadingAccounts ? 'Carregando...' : 'Selecione a empresa'} />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {filteredAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                ))}
                {filteredAccounts.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Nenhuma empresa encontrada</div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Quantidade</Label>
            <Input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>

          <div className="space-y-2">
            <Label>Motivo *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo da concessão..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleGrant} disabled={loading || !reason.trim() || !selectedAccountId}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Conceder {amount} créditos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
