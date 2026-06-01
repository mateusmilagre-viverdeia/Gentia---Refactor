import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Clock, TrendingDown, TrendingUp, UserX, Mail, Bell, Save, Check, X } from 'lucide-react';
import { useMetricThresholds, type MetricThresholds } from '@/hooks/useMetricThresholds';
import { useFunnelAnalytics } from '@/hooks/useFunnelAnalytics';
import { useTimeAnalytics } from '@/hooks/useTimeAnalytics';

export function MetricThresholdSettings() {
  const { thresholds, alerts, loading, saving, saveThresholds, updateThreshold, resolveAlert } = useMetricThresholds();
  const { data: funnelData } = useFunnelAnalytics('30d');
  
  const [emailInput, setEmailInput] = useState('');

  // Calculate current metrics for display
  const currentMetrics = {
    timeToHire: funnelData?.averageTimeToHire || 0,
    conversionRate: funnelData?.overallConversionRate || 0,
    rejectionRate: funnelData?.rejectionRate || 0,
  };

  const handleSave = () => {
    if (thresholds) {
      saveThresholds(thresholds);
    }
  };

  const addEmail = () => {
    if (!emailInput.trim() || !thresholds) return;
    
    const email = emailInput.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    
    if (!thresholds.notify_emails.includes(email)) {
      updateThreshold('notify_emails', [...thresholds.notify_emails, email]);
    }
    setEmailInput('');
  };

  const removeEmail = (email: string) => {
    if (!thresholds) return;
    updateThreshold('notify_emails', thresholds.notify_emails.filter(e => e !== email));
  };

  const getStatusBadge = (
    current: number, 
    threshold: number, 
    isMax: boolean,
    enabled: boolean
  ) => {
    if (!enabled) {
      return <Badge variant="outline" className="text-muted-foreground">Desativado</Badge>;
    }
    
    const isViolated = isMax ? current > threshold : current < threshold;
    
    if (isViolated) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {isMax ? 'Acima do limite' : 'Abaixo do limite'}
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
        <Check className="h-3 w-3 mr-1" />
        Dentro do limite
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!thresholds) return null;

  return (
    <div className="space-y-6">
      {/* Intro Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alertas de Métricas
          </CardTitle>
          <CardDescription>
            Configure alertas automáticos quando métricas de recrutamento ultrapassarem os limites definidos.
            Os alertas serão enviados por email e exibidos no sistema.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Time to Hire */}
      <Card className={thresholds.alert_time_to_hire && currentMetrics.timeToHire > thresholds.max_time_to_hire_days ? 'border-destructive/50' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg">Tempo de Contratação</CardTitle>
            </div>
            <Switch
              checked={thresholds.alert_time_to_hire}
              onCheckedChange={(checked) => updateThreshold('alert_time_to_hire', checked)}
            />
          </div>
          <CardDescription>Alertar quando o tempo médio de contratação exceder o limite</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="max-time">Máximo (dias)</Label>
              <Input
                id="max-time"
                type="number"
                min={1}
                max={365}
                value={thresholds.max_time_to_hire_days}
                onChange={(e) => updateThreshold('max_time_to_hire_days', parseInt(e.target.value) || 30)}
                disabled={!thresholds.alert_time_to_hire}
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <Label className="text-muted-foreground">Valor atual</Label>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-2xl font-bold">{currentMetrics.timeToHire.toFixed(0)}</span>
                <span className="text-muted-foreground">dias</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status:</span>
            {getStatusBadge(currentMetrics.timeToHire, thresholds.max_time_to_hire_days, true, thresholds.alert_time_to_hire)}
          </div>
        </CardContent>
      </Card>

      {/* Conversion Rate */}
      <Card className={thresholds.alert_conversion_rate && currentMetrics.conversionRate < thresholds.min_conversion_rate ? 'border-destructive/50' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <CardTitle className="text-lg">Taxa de Conversão</CardTitle>
            </div>
            <Switch
              checked={thresholds.alert_conversion_rate}
              onCheckedChange={(checked) => updateThreshold('alert_conversion_rate', checked)}
            />
          </div>
          <CardDescription>Alertar quando a taxa de conversão (contratados/candidatos) ficar abaixo do mínimo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="min-conversion">Mínimo (%)</Label>
              <Input
                id="min-conversion"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={thresholds.min_conversion_rate}
                onChange={(e) => updateThreshold('min_conversion_rate', parseFloat(e.target.value) || 3)}
                disabled={!thresholds.alert_conversion_rate}
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <Label className="text-muted-foreground">Valor atual</Label>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-2xl font-bold">{currentMetrics.conversionRate.toFixed(1)}</span>
                <span className="text-muted-foreground">%</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status:</span>
            {getStatusBadge(currentMetrics.conversionRate, thresholds.min_conversion_rate, false, thresholds.alert_conversion_rate)}
          </div>
        </CardContent>
      </Card>

      {/* Rejection Rate */}
      <Card className={thresholds.alert_rejection_rate && currentMetrics.rejectionRate > thresholds.max_rejection_rate ? 'border-destructive/50' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <CardTitle className="text-lg">Taxa de Rejeição</CardTitle>
            </div>
            <Switch
              checked={thresholds.alert_rejection_rate}
              onCheckedChange={(checked) => updateThreshold('alert_rejection_rate', checked)}
            />
          </div>
          <CardDescription>Alertar quando a taxa de rejeição (rejeitados/candidatos) exceder o máximo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="max-rejection">Máximo (%)</Label>
              <Input
                id="max-rejection"
                type="number"
                min={0}
                max={100}
                step={1}
                value={thresholds.max_rejection_rate}
                onChange={(e) => updateThreshold('max_rejection_rate', parseFloat(e.target.value) || 80)}
                disabled={!thresholds.alert_rejection_rate}
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <Label className="text-muted-foreground">Valor atual</Label>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-2xl font-bold">{currentMetrics.rejectionRate.toFixed(1)}</span>
                <span className="text-muted-foreground">%</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status:</span>
            {getStatusBadge(currentMetrics.rejectionRate, thresholds.max_rejection_rate, true, thresholds.alert_rejection_rate)}
          </div>
        </CardContent>
      </Card>

      {/* Stagnant Pipeline */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-lg">Pipeline Estagnado</CardTitle>
            </div>
            <Switch
              checked={thresholds.alert_stagnant_pipeline}
              onCheckedChange={(checked) => updateThreshold('alert_stagnant_pipeline', checked)}
            />
          </div>
          <CardDescription>Alertar quando candidatos ficarem parados na mesma etapa por muito tempo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="max-stagnant">Máximo de dias na mesma etapa</Label>
              <Input
                id="max-stagnant"
                type="number"
                min={1}
                max={90}
                value={thresholds.max_stagnant_days}
                onChange={(e) => updateThreshold('max_stagnant_days', parseInt(e.target.value) || 14)}
                disabled={!thresholds.alert_stagnant_pipeline}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Email Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              <CardTitle className="text-lg">Configurações de Email</CardTitle>
            </div>
            <Switch
              checked={thresholds.email_enabled}
              onCheckedChange={(checked) => updateThreshold('email_enabled', checked)}
            />
          </div>
          <CardDescription>
            Receber alertas por email quando thresholds forem violados.
            <br />
            <span className="text-xs">
              Os alertas são enviados automaticamente apenas para usuários com função{' '}
              <strong>Owner</strong>, <strong>Admin</strong> ou <strong>Admin RH</strong> da conta.
              Use o campo abaixo para incluir destinatários adicionais.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="frequency">Frequência</Label>
            <Select
              value={thresholds.email_frequency}
              onValueChange={(value) => updateThreshold('email_frequency', value as MetricThresholds['email_frequency'])}
              disabled={!thresholds.email_enabled}
            >
              <SelectTrigger id="frequency" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instant">Instantâneo (a cada violação)</SelectItem>
                <SelectItem value="daily">Diário (resumo às 8h)</SelectItem>
                <SelectItem value="weekly">Semanal (resumo às segundas)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Emails adicionais para notificar</Label>
            <div className="flex gap-2 mt-1">
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addEmail()}
                disabled={!thresholds.email_enabled}
              />
              <Button onClick={addEmail} variant="outline" disabled={!thresholds.email_enabled}>
                Adicionar
              </Button>
            </div>
            {thresholds.notify_emails.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {thresholds.notify_emails.map((email) => (
                  <Badge key={email} variant="secondary" className="flex items-center gap-1">
                    {email}
                    <button
                      onClick={() => removeEmail(email)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Alertas Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    alert.is_resolved ? 'bg-muted/50' : 'bg-destructive/5 border-destructive/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      alert.is_resolved ? 'bg-muted' : 'bg-destructive/10'
                    }`}>
                      {alert.alert_type === 'time_to_hire' && <Clock className="h-4 w-4" />}
                      {alert.alert_type === 'conversion_rate' && <TrendingUp className="h-4 w-4" />}
                      {alert.alert_type === 'rejection_rate' && <TrendingDown className="h-4 w-4" />}
                      {alert.alert_type === 'stagnant_pipeline' && <UserX className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium">
                        {alert.alert_type === 'time_to_hire' && 'Tempo de Contratação'}
                        {alert.alert_type === 'conversion_rate' && 'Taxa de Conversão'}
                        {alert.alert_type === 'rejection_rate' && 'Taxa de Rejeição'}
                        {alert.alert_type === 'stagnant_pipeline' && 'Pipeline Estagnado'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Valor: {alert.metric_value.toFixed(1)} | Limite: {alert.threshold_value.toFixed(1)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {alert.is_resolved ? (
                      <Badge variant="outline" className="text-green-600">Resolvido</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveAlert(alert.id)}
                      >
                        Marcar como resolvido
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
}
