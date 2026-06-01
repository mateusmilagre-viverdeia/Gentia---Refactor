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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Users, Plus, Minus, Loader2, Info, Calendar, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatBRT } from "@/lib/datetime";


interface PurchaseSeatsModalProps {
  open: boolean;
  onClose: () => void;
  accountId: string;
  currentSeats: number;
  usedSeats: number;
  pendingSeats: number;
  isEPPartnerOrg?: boolean;
}

interface PriceInfo {
  currentMonthlyAmount: number;
  currentSeatQuantity: number;
  basePlanAmount: number;
  currentSeatsAmount: number;
  seatsToAdd: number;
  increaseAmount: number;
  newSeatQuantity: number;
  newSeatsAmount: number;
  newMonthlyAmount: number;
  proRataCharge: number;
  remainingDays: number;
  totalDays: number;
  nextBillingDate: string;
  subscriptionId: string;
  seatSubscriptionItemId: string | null;
  seatPriceId: string;
  unitPrice: number;
}

const SEAT_PRICE_BRL = 19.90;

export function PurchaseSeatsModal({
  open,
  onClose,
  accountId,
  currentSeats,
  usedSeats,
  pendingSeats,
  isEPPartnerOrg = false,
}: PurchaseSeatsModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [priceInfo, setPriceInfo] = useState<PriceInfo | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  const totalNeeded = usedSeats + pendingSeats;
  const minimumNeeded = Math.max(1, totalNeeded - currentSeats + 1);

  useEffect(() => {
    if (open && accountId && !isEPPartnerOrg) {
      fetchPricePreview();
    }
  }, [open, accountId, quantity, isEPPartnerOrg]);

  const fetchPricePreview = async () => {
    setLoadingPrice(true);
    setPriceError(null);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-seats-increase', {
        body: {
          account_id: accountId,
          quantity,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPriceInfo(data);
    } catch (error) {
      console.error('Error fetching price preview:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao calcular preço';
      setPriceError(errorMessage);
      setPriceInfo(null);
    } finally {
      setLoadingPrice(false);
    }
  };

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-seats-checkout', {
        body: {
          account_id: accountId,
          quantity: quantity,
          price_id: priceInfo?.seatPriceId || 'price_1RHqWXLTBUDFdRj5VYpVDawg',
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Check if seats were added for free (EP Partner org)
      if (data?.exempt) {
        toast.success(data.message || `${quantity} assento(s) adicionado(s) com sucesso!`);
        onClose();
        return;
      }

      if (data?.url) {
        toast.info('Redirecionando para pagamento...');
        window.open(data.url, '_blank');
        onClose();
      } else {
        throw new Error('URL de checkout não retornada');
      }
    } catch (error) {
      console.error('Error purchasing seats:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const increment = () => setQuantity((q) => q + 1);
  const decrement = () => setQuantity((q) => Math.max(1, q - 1));

  const formatNextBillingDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      return formatBRT(new Date(dateString), "dd 'de' MMMM 'de' yyyy");
    } catch {
      return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Comprar Assentos Adicionais
          </DialogTitle>
          <DialogDescription>
            Adicione mais assentos para convidar novos membros para sua equipe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current status */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{currentSeats}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{usedSeats}</p>
              <p className="text-xs text-muted-foreground">Em uso</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{pendingSeats}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </div>

          {/* Quantity selector */}
          <div className="space-y-2">
            <Label>Quantidade de assentos</Label>
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
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center"
              />
              <Button variant="outline" size="icon" onClick={increment}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {minimumNeeded > 1 && (
              <p className="text-xs text-muted-foreground">
                Mínimo recomendado: {minimumNeeded} assento(s)
              </p>
            )}
          </div>

          {/* Price summary */}
          <div className="p-4 bg-muted/50 rounded-lg border">
            {isEPPartnerOrg ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Organização de Sócio EP</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Sua organização está vinculada a um sócio EP. Você pode adicionar assentos gratuitamente, sem cobrança.
                </p>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm">
                    {quantity} assento{quantity > 1 ? 's' : ''} adicional{quantity > 1 ? 'is' : ''}
                  </span>
                  <span className="text-xl font-bold text-green-600">
                    Grátis
                  </span>
                </div>
              </div>
            ) : loadingPrice ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Calculando valor...</span>
              </div>
            ) : priceError ? (
              <div className="text-center py-4">
                <p className="text-sm text-destructive">{priceError}</p>
                <Button variant="link" size="sm" onClick={fetchPricePreview} className="mt-2">
                  Tentar novamente
                </Button>
              </div>
            ) : priceInfo ? (
              <div className="space-y-3">
                {/* Pro-rata payment now */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-muted-foreground">
                      Pagamento agora
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">
                            <strong>Cálculo pro-rata:</strong> Você paga apenas pelos {priceInfo.remainingDays} dias restantes até o próximo ciclo de cobrança.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-primary">
                      R$ {priceInfo.proRataCharge.toFixed(2)}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      ({priceInfo.remainingDays} dias restantes)
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Next billing cycle - detailed breakdown */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      Próximo ciclo
                      {priceInfo.nextBillingDate && (
                        <span className="font-normal text-muted-foreground ml-1">
                          ({formatNextBillingDate(priceInfo.nextBillingDate)})
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Breakdown items */}
                  <div className="space-y-1 text-sm">
                    {priceInfo.basePlanAmount > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Plano base</span>
                        <span>R$ {priceInfo.basePlanAmount.toFixed(2)}</span>
                      </div>
                    )}
                    
                    {priceInfo.currentSeatQuantity > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>+ {priceInfo.currentSeatQuantity} assento{priceInfo.currentSeatQuantity > 1 ? 's' : ''} atual{priceInfo.currentSeatQuantity > 1 ? 'is' : ''}</span>
                        <span>R$ {priceInfo.currentSeatsAmount.toFixed(2)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-primary font-medium">
                      <span>+ {quantity} novo{quantity > 1 ? 's' : ''} assento{quantity > 1 ? 's' : ''}</span>
                      <span>R$ {priceInfo.increaseAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Total */}
                  <Separator className="my-2" />
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total mensal</span>
                    <span className="text-lg font-bold text-primary">
                      R$ {priceInfo.newMonthlyAmount.toFixed(2)}/mês
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    {quantity} assento{quantity > 1 ? 's' : ''} × R$ {SEAT_PRICE_BRL.toFixed(2)}/mês
                  </span>
                  <span className="text-xl font-bold">
                    R$ {(quantity * SEAT_PRICE_BRL).toFixed(2)}/mês
                  </span>
                </div>
              </div>
            )}
            
            {!isEPPartnerOrg && (
              <p className="text-xs text-muted-foreground mt-3">
                A cobrança será processada automaticamente no seu método de pagamento cadastrado.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handlePurchase} 
            disabled={loading || (!isEPPartnerOrg && (loadingPrice || !!priceError || !priceInfo))}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : isEPPartnerOrg ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Adicionar Gratuitamente
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmar Compra
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
