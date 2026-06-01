import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Bell, Users, Clock, AlertTriangle, Video, Briefcase, Save, 
  Target, Mail, Calendar, Zap, TestTube2, Loader2 
} from 'lucide-react';
import { useRecruitmentNotificationSettings } from '@/hooks/useRecruitmentNotificationSettings';

interface NotificationToggleProps {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  iconBgClass: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  emailChecked?: boolean;
  onEmailChange?: (checked: boolean) => void;
  showDays?: boolean;
  days?: number;
  onDaysChange?: (days: number) => void;
  daysLabel?: string;
  maxDays?: number;
}

function NotificationToggle({
  id,
  label,
  description,
  icon,
  iconBgClass,
  checked,
  onCheckedChange,
  emailChecked,
  onEmailChange,
  showDays,
  days,
  onDaysChange,
  daysLabel = 'dias',
  maxDays = 30,
}: NotificationToggleProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${iconBgClass}`}>
            {icon}
          </div>
          <div>
            <Label htmlFor={id} className="font-medium">
              {label}
            </Label>
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {showDays && onDaysChange && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Após</span>
              <Input
                type="number"
                min={1}
                max={maxDays}
                value={days}
                onChange={(e) => onDaysChange(parseInt(e.target.value) || 1)}
                className="w-16 h-8"
                disabled={!checked}
              />
              <span className="text-sm text-muted-foreground">{daysLabel}</span>
            </div>
          )}
          <Switch
            id={id}
            checked={checked}
            onCheckedChange={onCheckedChange}
          />
        </div>
      </div>
      
      {checked && onEmailChange !== undefined && (
        <div className="ml-11 flex items-center justify-between bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label htmlFor={`${id}_email`} className="font-medium text-sm">
                Enviar também por email
              </Label>
              <p className="text-xs text-muted-foreground">
                Receba um email além da notificação in-app
              </p>
            </div>
          </div>
          <Switch
            id={`${id}_email`}
            checked={emailChecked}
            onCheckedChange={onEmailChange}
          />
        </div>
      )}
    </div>
  );
}

export function RecruitmentNotificationSettings() {
  const { 
    settings, 
    loading, 
    saving, 
    testing,
    saveSettings, 
    updateSetting,
    sendTestNotification,
  } = useRecruitmentNotificationSettings();

  const handleSave = () => {
    if (settings) {
      saveSettings(settings);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-6 w-10" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!settings) return null;

  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: i.toString(),
    label: `${i.toString().padStart(2, '0')}:00`,
  }));

  const dayOptions = [
    { value: '0', label: 'Domingo' },
    { value: '1', label: 'Segunda-feira' },
    { value: '2', label: 'Terça-feira' },
    { value: '3', label: 'Quarta-feira' },
    { value: '4', label: 'Quinta-feira' },
    { value: '5', label: 'Sexta-feira' },
    { value: '6', label: 'Sábado' },
  ];

  return (
    <div className="space-y-6">
      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Tipos de Alerta
          </CardTitle>
          <CardDescription>
            Configure quais alertas você deseja receber e se deseja também por email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <NotificationToggle
            id="notify_new_applications"
            label="Novas candidaturas"
            description="Receba alertas quando novos candidatos se aplicarem"
            icon={<Users className="h-4 w-4" />}
            iconBgClass="bg-green-100 text-green-600"
            checked={settings.notify_new_applications}
            onCheckedChange={(checked) => updateSetting('notify_new_applications', checked)}
            emailChecked={settings.notify_new_applications_email}
            onEmailChange={(checked) => updateSetting('notify_new_applications_email', checked)}
          />

          <Separator />

          <NotificationToggle
            id="notify_final_evaluation"
            label="Candidato em Avaliação Final"
            description="Alertas quando candidatos chegarem na etapa de avaliação final"
            icon={<Target className="h-4 w-4" />}
            iconBgClass="bg-amber-100 text-amber-600"
            checked={settings.notify_final_evaluation}
            onCheckedChange={(checked) => updateSetting('notify_final_evaluation', checked)}
            emailChecked={settings.notify_final_evaluation_email}
            onEmailChange={(checked) => updateSetting('notify_final_evaluation_email', checked)}
          />

          <Separator />

          <NotificationToggle
            id="notify_pending_evaluations"
            label="Avaliações pendentes"
            description="Alertas para candidatos aguardando avaliação"
            icon={<Clock className="h-4 w-4" />}
            iconBgClass="bg-amber-100 text-amber-600"
            checked={settings.notify_pending_evaluations}
            onCheckedChange={(checked) => updateSetting('notify_pending_evaluations', checked)}
            emailChecked={settings.notify_pending_evaluations_email}
            onEmailChange={(checked) => updateSetting('notify_pending_evaluations_email', checked)}
            showDays
            days={settings.pending_evaluation_days}
            onDaysChange={(days) => updateSetting('pending_evaluation_days', days)}
          />

          <Separator />

          <NotificationToggle
            id="notify_interview_reminders"
            label="Lembretes de entrevista"
            description="Receba lembretes um dia antes das entrevistas agendadas"
            icon={<Video className="h-4 w-4" />}
            iconBgClass="bg-purple-100 text-purple-600"
            checked={settings.notify_interview_reminders}
            onCheckedChange={(checked) => updateSetting('notify_interview_reminders', checked)}
            emailChecked={settings.notify_interview_reminders_email}
            onEmailChange={(checked) => updateSetting('notify_interview_reminders_email', checked)}
          />

          <Separator />

          <NotificationToggle
            id="notify_stale_jobs"
            label="Vagas sem movimentação"
            description="Alertas para vagas sem novas candidaturas"
            icon={<Briefcase className="h-4 w-4" />}
            iconBgClass="bg-blue-100 text-blue-600"
            checked={settings.notify_stale_jobs}
            onCheckedChange={(checked) => updateSetting('notify_stale_jobs', checked)}
            emailChecked={settings.notify_stale_jobs_email}
            onEmailChange={(checked) => updateSetting('notify_stale_jobs_email', checked)}
            showDays
            days={settings.stale_job_days}
            onDaysChange={(days) => updateSetting('stale_job_days', days)}
            maxDays={60}
          />

          <Separator />

          <NotificationToggle
            id="notify_stale_candidates"
            label="Candidatos parados no funil"
            description="Alertas para candidatos estagnados em uma etapa"
            icon={<AlertTriangle className="h-4 w-4" />}
            iconBgClass="bg-red-100 text-red-600"
            checked={settings.notify_stale_candidates}
            onCheckedChange={(checked) => updateSetting('notify_stale_candidates', checked)}
            emailChecked={settings.notify_stale_candidates_email}
            onEmailChange={(checked) => updateSetting('notify_stale_candidates_email', checked)}
            showDays
            days={settings.stale_candidate_days}
            onDaysChange={(days) => updateSetting('stale_candidate_days', days)}
          />
        </CardContent>
      </Card>

      {/* Frequency Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Frequência e Horário
          </CardTitle>
          <CardDescription>
            Configure quando deseja receber os emails de notificação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label className="font-medium">Modo de entrega de emails</Label>
            <RadioGroup
              value={settings.digest_mode}
              onValueChange={(value) => updateSetting('digest_mode', value as 'realtime' | 'daily' | 'weekly')}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="realtime" id="realtime" />
                <div className="flex-1">
                  <Label htmlFor="realtime" className="flex items-center gap-2 cursor-pointer font-medium">
                    <Zap className="h-4 w-4 text-warning" />
                    Tempo real
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Receba emails instantaneamente
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="daily" id="daily" />
                <div className="flex-1">
                  <Label htmlFor="daily" className="flex items-center gap-2 cursor-pointer font-medium">
                    <Clock className="h-4 w-4 text-primary" />
                    Resumo diário
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Um email por dia com resumo
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="weekly" id="weekly" />
                <div className="flex-1">
                  <Label htmlFor="weekly" className="flex items-center gap-2 cursor-pointer font-medium">
                    <Calendar className="h-4 w-4 text-accent-foreground" />
                    Resumo semanal
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Um email por semana
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {settings.digest_mode !== 'realtime' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Horário preferido</Label>
                <Select
                  value={settings.preferred_hour.toString()}
                  onValueChange={(value) => updateSetting('preferred_hour', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o horário" />
                  </SelectTrigger>
                  <SelectContent>
                    {hourOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Horário de Brasília (GMT-3)
                </p>
              </div>

              {settings.digest_mode === 'weekly' && (
                <div className="space-y-2">
                  <Label>Dia do resumo semanal</Label>
                  <Select
                    value={settings.digest_day.toString()}
                    onValueChange={(value) => updateSetting('digest_day', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o dia" />
                    </SelectTrigger>
                    <SelectContent>
                      {dayOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações Avançadas</CardTitle>
          <CardDescription>
            Opções adicionais de notificação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notify_owner_only" className="font-medium">
                Notificar apenas responsável
              </Label>
              <p className="text-sm text-muted-foreground">
                Se ativado, apenas o criador da vaga receberá notificações (quando aplicável)
              </p>
            </div>
            <Switch
              id="notify_owner_only"
              checked={settings.notify_owner_only}
              onCheckedChange={(checked) => updateSetting('notify_owner_only', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Test Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube2 className="h-5 w-5" />
            Testar Notificações
          </CardTitle>
          <CardDescription>
            Envie uma notificação de teste para verificar se as configurações estão funcionando
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => sendTestNotification('in_app')}
              disabled={testing}
            >
              {testing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Bell className="h-4 w-4 mr-2" />
              )}
              Enviar notificação de teste
            </Button>
            <Button
              variant="outline"
              onClick={() => sendTestNotification('email')}
              disabled={testing}
            >
              {testing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Enviar email de teste
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
}