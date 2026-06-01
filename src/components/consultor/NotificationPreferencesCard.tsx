import { useConsultantNotificationPreferences } from '@/hooks/useConsultantNotificationPreferences';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Calendar, AlertCircle, Mail } from 'lucide-react';

export function NotificationPreferencesCard() {
  const { preferences, loading, saving, updatePreferences } = useConsultantNotificationPreferences();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Preferências de Notificação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-6 w-10" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!preferences) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Preferências de Notificação
        </CardTitle>
        <CardDescription>
          Configure quais notificações você deseja receber sobre seus projetos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pending Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label htmlFor="notify-actions" className="font-medium">
                Novas ações pendentes
              </Label>
              <p className="text-sm text-muted-foreground">
                Receber notificação quando novas ações forem criadas
              </p>
            </div>
          </div>
          <Switch
            id="notify-actions"
            checked={preferences.notify_pending_actions}
            disabled={saving}
            onCheckedChange={(checked) => 
              updatePreferences({ notify_pending_actions: checked })
            }
          />
        </div>

        {/* Upcoming Checkpoints */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label htmlFor="notify-checkpoints" className="font-medium">
                Checkpoints próximos
              </Label>
              <p className="text-sm text-muted-foreground">
                Receber notificação de novos checkpoints agendados
              </p>
            </div>
          </div>
          <Switch
            id="notify-checkpoints"
            checked={preferences.notify_upcoming_checkpoints}
            disabled={saving}
            onCheckedChange={(checked) => 
              updatePreferences({ notify_upcoming_checkpoints: checked })
            }
          />
        </div>

        {/* Overdue Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <div>
              <Label htmlFor="notify-overdue" className="font-medium">
                Ações atrasadas
              </Label>
              <p className="text-sm text-muted-foreground">
                Receber notificação quando ações estiverem atrasadas
              </p>
            </div>
          </div>
          <Switch
            id="notify-overdue"
            checked={preferences.notify_overdue_actions}
            disabled={saving}
            onCheckedChange={(checked) => 
              updatePreferences({ notify_overdue_actions: checked })
            }
          />
        </div>

        {/* Checkpoint Reminder Days */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label htmlFor="reminder-days" className="font-medium">
                Lembrete de checkpoint
              </Label>
              <p className="text-sm text-muted-foreground">
                Quantos dias antes do checkpoint você deseja ser lembrado
              </p>
            </div>
          </div>
          <Select
            value={preferences.checkpoint_reminder_days.toString()}
            disabled={saving}
            onValueChange={(value) => 
              updatePreferences({ checkpoint_reminder_days: parseInt(value) })
            }
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 dia</SelectItem>
              <SelectItem value="2">2 dias</SelectItem>
              <SelectItem value="3">3 dias</SelectItem>
              <SelectItem value="5">5 dias</SelectItem>
              <SelectItem value="7">7 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Email Notifications */}
        <div className="flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label htmlFor="email-notifications" className="font-medium">
                Notificações por e-mail
              </Label>
              <p className="text-sm text-muted-foreground">
                Receber notificações também por e-mail
              </p>
            </div>
          </div>
          <Switch
            id="email-notifications"
            checked={preferences.email_notifications}
            disabled={saving}
            onCheckedChange={(checked) => 
              updatePreferences({ email_notifications: checked })
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
