import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Minus, Plus, Loader2, AlertTriangle, TrendingDown, Calendar, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatBRT } from "@/lib/datetime";


interface ReduceSeatsModalProps {
  open: boolean;
  onClose: () => void;
  accountId: string;
  additionalSeats: number;
  usedSeats: number;
  pendingSeats: number;
  includedSeats: number;
  onSuccess: () => void;
}

interface ReductionPriceInfo {
  currentMonthlyAmount: number;
  currentSeatQuantity: number;
  basePlanAmount: number;
  currentSeatsAmount: number;
  seatsToRemove: number;
  reductionAmount: number;
  newSeatQuantity: number;
  newSeatsAmount: number;
  newMonthlyAmount: number;
  proRataCredit: number;
  remainingDays: number;
  totalDays: number;
  nextBillingDate: string;
  subscriptionId: string;
  seatSubscriptionItemId: string;
  seatPriceId: string;
  unitPrice: number;
}

export function ReduceSeatsModal({
  open,
  onClose,
  accountId,
  additionalSeats,
  usedSeats,
  pendingSeats,
  includedSeats,
  onSuccess,
}: ReduceSeatsModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [priceInfo, setPriceInfo] = useState<ReductionPriceInfo | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  // Calculate constraints
  const totalCurrentSeats = includedSeats + additionalSeats;
  const occupiedSeats = usedSeats + pendingSeats;
  const minSeatsRequired = Math.max(0, occupiedSeats - includedSeats);
  const maxRemovable = additionalSeats - minSeatsRequired;
  const canReduce = maxRemovable > 0;

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setQuantity(Math.min(1, maxRemovable));
      setPriceInfo(null);
      setPriceError(null);
    }
  }, [open, maxRemovable]);

  // Fetch price preview when quantity changes
  useEffect(() => {
    if (open && accountId && canReduce && quantity >= 1 && quantity <= maxRemovable) {
      fetchPricePreview();
    }
  }, [open, accountId, quantity, canReduce, maxRemovable]);

  const fetchPricePreview = async () => {
    setLoadingPrice(true);
    setPriceError(null);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-seats-reduction', {
        body: {
          account_id: accountId,
          quantity,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      setPriceInfo(data);
    } catch (error) {
      console.error('Error fetching reduction price preview:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao calcular valores';
      setPriceError(errorMessage);
      setPriceInfo(null);
    } finally {
      setLoadingPrice(false);
    }
  };

  const handleReduce = async () => {
    if (quantity < 1 || quantity > maxRemovable || !priceInfo) {
      toast.error('Quantidade inválida ou informações de preço não disponíveis');
      return;
    }

    setLoading(true);
    try {
      console.log('[ReduceSeats] Calling reduce-subscription-seats directly...');
      
      const { data, error } = await supabase.functions.invoke('reduce-subscription-seats', {
        body: {
          account_id: accountId,
          quantity,
        },
      });

      console.log('[ReduceSeats] Response:', { data, error });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(data?.message || 'Redução confirmada! A alteração entrará em vigor na próxima fatura.');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('[ReduceSeats] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar. Tente novamente.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const increment = () => setQuantity((q) => Math.min(q + 1, maxRemovable));
  const decrement = () => setQuantity((q) => Math.max(1, q - 1));

  const formatNextBillingDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      return formatBRT(new Date(dateString), "dd 'de' MMMM 'de' yyyy");
    } catch {
      return null;
    }
  };

  const newAdditionalSeats = additionalSeats - quantity;
  const newTotalSeats = includedSeats + newAdditionalSeats;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Reduzir Assentos
          </DialogTitle>
          <DialogDescription>
            Reduza a quantidade de assentos adicionais pagos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current status */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{additionalSeats}</p>
              <p className="text-xs text-muted-foreground">Assentos adicionais</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{occupiedSeats}</p>
              <p className="text-xs text-muted-foreground">Em uso + pendentes</p>
            </div>
          </div>

          {!canReduce ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Não é possível reduzir assentos. Você tem {occupiedSeats} usuário(s) ativo(s) ou pendente(s)
                e apenas {includedSeats} assento(s) incluído(s) no plano base.
                Remova membros ou cancele convites primeiro.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Quantity selector */}
              <div className="space-y-2">
                <Label>Quantidade a remover</Label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={decrement}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    max={maxRemovable}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.min(maxRemovable, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-20 text-center"
                  />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={increment}
                    disabled={quantity >= maxRemovable}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Máximo removível: {maxRemovable} assento(s)
                </p>
              </div>

              {/* Price summary */}
              <div className="p-4 bg-muted/50 rounded-lg border">
                {loadingPrice ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Calculando valores...</span>
                  </div>
                ) : priceError ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-destructive">{priceError}</p>
                    <Button 
                      variant="link" 
                      size="sm" 
                      onClick={fetchPricePreview}
                      className="mt-2"
                    >
                      Tentar novamente
                    </Button>
                  </div>
                ) : priceInfo ? (
                  <div className="space-y-3">
                    {/* Current vs New monthly */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Valor mensal atual</span>
                        <span className="font-medium">R$ {priceInfo.currentMonthlyAmount.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm text-green-600">
                        <span>Redução mensal</span>
                        <span className="font-medium">- R$ {priceInfo.reductionAmount.toFixed(2)}</span>
                      </div>
                      
                      <Separator />
                      
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Novo valor mensal</span>
                        <span className="text-xl font-bold text-primary">
                          R$ {priceInfo.newMonthlyAmount.toFixed(2)}/mês
                        </span>
                      </div>
                    </div>

                    <Separator />

                    {/* Next billing date - reduction effective date */}
                    {priceInfo.nextBillingDate && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          Próxima fatura: {formatNextBillingDate(priceInfo.nextBillingDate)}
                        </span>
                      </div>
                    )}

                    {/* Breakdown summary */}
                    <div className="mt-3 pt-3 border-t border-dashed space-y-1 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Plano base</span>
                        <span>R$ {priceInfo.basePlanAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>{priceInfo.currentSeatQuantity} assento{priceInfo.currentSeatQuantity > 1 ? 's' : ''} → {priceInfo.newSeatQuantity} assento{priceInfo.newSeatQuantity !== 1 ? 's' : ''}</span>
                        <span>R$ {priceInfo.newSeatsAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Selecione a quantidade para ver os valores
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground mt-3">
                  A redução será aplicada a partir da próxima fatura. Nenhum crédito será gerado.
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            variant="destructive"
            onClick={handleReduce} 
            disabled={loading || !canReduce || quantity < 1 || loadingPrice || !priceInfo}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmar Redução
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
