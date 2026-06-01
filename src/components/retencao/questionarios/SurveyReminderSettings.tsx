import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";
import { REMINDER_OPTIONS } from "@/types/survey.types";

interface SurveyReminderSettingsProps {
  reminderEnabled: boolean;
  reminderDaysBefore: number[];
  onChange: (data: {
    reminderEnabled: boolean;
    reminderDaysBefore: number[];
  }) => void;
}

export function SurveyReminderSettings({
  reminderEnabled,
  reminderDaysBefore,
  onChange,
}: SurveyReminderSettingsProps) {
  const handleDayToggle = (day: number, checked: boolean) => {
    const newDays = checked
      ? [...reminderDaysBefore, day].sort((a, b) => b - a)
      : reminderDaysBefore.filter((d) => d !== day);
    onChange({ reminderEnabled, reminderDaysBefore: newDays });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Lembretes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Habilitar lembretes automáticos</Label>
            <p className="text-xs text-muted-foreground">
              Notificar participantes antes do início
            </p>
          </div>
          <Switch
            checked={reminderEnabled}
            onCheckedChange={(checked) =>
              onChange({
                reminderEnabled: checked,
                reminderDaysBefore: checked ? [7, 3, 1] : [],
              })
            }
          />
        </div>

        {reminderEnabled && (
          <div className="space-y-3">
            <Label>Enviar lembretes:</Label>
            <div className="space-y-2">
              {REMINDER_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`reminder-${option.value}`}
                    checked={reminderDaysBefore.includes(option.value)}
                    onCheckedChange={(checked) =>
                      handleDayToggle(option.value, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`reminder-${option.value}`}
                    className="text-sm cursor-pointer"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              📧 Lembretes serão enviados como notificações internas para todos
              os usuários convidados.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
