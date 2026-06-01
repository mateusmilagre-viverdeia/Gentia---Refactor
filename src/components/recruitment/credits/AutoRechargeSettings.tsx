import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Zap, Info, Loader2, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';
import { useAutoRecharge } from '@/hooks/useAutoRecharge';
import { toast } from 'sonner';
import { formatBRT } from '@/lib/datetime';

const STATUS_LABEL: Record<string, { label: string; icon: any; className: string }> = {
  success: { label: 'Sucesso', icon: CheckCircle2, className: 'text-emerald-600' },
  failed: { label: 'Falhou', icon: XCircle, className: 'text-destructive' },
  skipped: { label: 'Pulada', icon: Clock, className: 'text-muted-foreground' },
};

const REASON_LABEL: Record<string, string> = {
  ok: 'Recarga concluída',
  above_threshold: 'Saldo acima do limite — recarga não necessária',
  no_package: 'Pacote de recarga não configurado',
  no_stripe_customer: 'Cliente Stripe não configurado',
  payment_failed: 'Pagamento recusado pelo Stripe (verifique o método de pagamento)',
  credit_post_failed: 'Cobrança feita mas créditos não foram lançados — contate o suporte',
  lock_active: 'Outra recarga em andamento',
  not_enabled: 'Recarga automática desativada',
};

export function AutoRechargeSettings() {
  const { packages } = useCredits();
  const { settings, attempts, isLoading, save, isSaving } = useAutoRecharge();

  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState('5');
  const [packageId, setPackageId] = useState('');

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setThreshold(String(settings.threshold));
      setPackageId(settings.recharge_package_id || '');
    }
  }, [settings]);

  const handleSave = async () => {
    if (enabled && !packageId) {
      toast.error('Selecione um pacote para recarga automática');
      return;
    }

    const thresholdNum = parseFloat(threshold);
    if (enabled && (isNaN(thresholdNum) || thresholdNum < 1)) {
      toast.error('O threshold mínimo deve ser pelo menos 1');
      return;
    }

    await save({
      enabled,
      threshold: thresholdNum || 5,
      recharge_package_id: packageId || null,
    });
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary" />
              Recarga Automática
              {enabled && (
                <Badge variant="default" className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  Ativa
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Recarregue créditos automaticamente para não interromper seus processos seletivos
            </CardDescription>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-4 pt-0">
          <div className="space-y-2">
            <Label htmlFor="threshold" className="text-xs">
              Recarregar quando o saldo for menor que
            </Label>
            <Input
              id="threshold"
              type="number"
              min={1}
              step={1}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="max-w-[200px]"
              placeholder="5"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="package" className="text-xs">
              Pacote para recarga automática
            </Label>
            <Select value={packageId} onValueChange={setPackageId}>
              <SelectTrigger className="max-w-[300px]">
                <SelectValue placeholder="Selecione um pacote" />
              </SelectTrigger>
              <SelectContent>
                {packages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    {pkg.name} — {pkg.credits} créditos (R$ {(pkg.price_cents / 100).toFixed(2)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              A recarga será cobrada automaticamente no método de pagamento salvo no Stripe.
              Certifique-se de ter um método de pagamento válido configurado.
            </span>
          </div>

          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : null}
            Salvar Configurações
          </Button>

          {settings?.last_recharge_status === 'failed' && (
            <div className="flex items-start gap-2 p-3 rounded-md border border-destructive/50 bg-destructive/10 text-xs">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
              <div className="space-y-1">
                <p className="font-medium text-destructive">A última recarga automática falhou</p>
                <p className="text-muted-foreground">
                  {REASON_LABEL[settings.last_recharge_reason || ''] || settings.last_recharge_reason || 'Motivo desconhecido'}.
                  {' '}Atualize seu método de pagamento para evitar interrupção das entrevistas.
                </p>
              </div>
            </div>
          )}

          {settings?.last_recharge_at && (
            <div className="space-y-2">
              <Label className="text-xs">Última recarga automática</Label>
              <div className="text-xs text-muted-foreground">
                {(() => {
                  const meta = STATUS_LABEL[settings.last_recharge_status || ''] || STATUS_LABEL.skipped;
                  const Icon = meta.icon;
                  return (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Icon className={`h-3.5 w-3.5 ${meta.className}`} />
                      <span className={meta.className}>{meta.label}</span>
                      <span>•</span>
                      <span>{formatBRT(settings.last_recharge_at, "dd/MM/yyyy 'às' HH:mm")}</span>
                      {settings.last_recharge_reason && (
                        <>
                          <span>•</span>
                          <span>{REASON_LABEL[settings.last_recharge_reason] || settings.last_recharge_reason}</span>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {attempts.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">Últimas tentativas</Label>
              <div className="rounded-md border divide-y">
                {attempts.map((a) => {
                  const meta = STATUS_LABEL[a.status] || STATUS_LABEL.skipped;
                  const Icon = meta.icon;
                  return (
                    <div key={a.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${meta.className}`} />
                        <span className="text-muted-foreground shrink-0">
                          {formatBRT(a.created_at, "dd/MM HH:mm")}
                        </span>
                        <span className="truncate">
                          {REASON_LABEL[a.reason || ''] || a.reason || meta.label}
                        </span>
                      </div>
                      {a.credits_added ? (
                        <span className="text-emerald-600 shrink-0">+{a.credits_added} créditos</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      )}

      {!enabled && (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            Ative para recarregar créditos automaticamente quando o saldo ficar baixo.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
