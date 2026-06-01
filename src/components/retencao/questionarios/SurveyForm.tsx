import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, Save, Send, ArrowLeft, BookmarkPlus } from "lucide-react";
import { addDays, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { SurveyQuestionEditor } from "./SurveyQuestionEditor";
import { SurveyRecurrenceSettings } from "./SurveyRecurrenceSettings";
import { SurveyReminderSettings } from "./SurveyReminderSettings";
import { TemplateSaveModal } from "./TemplateSaveModal";
import type { Survey, SurveyQuestion, SurveyTemplate, SurveyCategory, RecurrencePattern, CustomRecurrenceDate } from "@/types/survey.types";
import { CATEGORY_LABELS } from "@/types/survey.types";
import { formatBRT } from "@/lib/datetime";

interface SurveyFormProps {
  initialData?: Survey & { questions?: SurveyQuestion[] };
  template?: SurveyTemplate | null;
  templateQuestions?: any[];
  onSave: (data: any) => Promise<void>;
  onPublish?: (id: string) => Promise<void>;
  onSaveAsTemplate?: (surveyId: string, name: string, description: string) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

export function SurveyForm({
  initialData,
  template,
  templateQuestions,
  onSave,
  onPublish,
  onSaveAsTemplate,
  onCancel,
  isSaving,
}: SurveyFormProps) {
  const [title, setTitle] = useState(initialData?.title || template?.name || "");
  const [description, setDescription] = useState(initialData?.description || template?.description || "");
  const [category, setCategory] = useState<SurveyCategory | "">(
    (initialData?.category as SurveyCategory) || (template?.category as SurveyCategory) || ""
  );
  const [isAnonymous, setIsAnonymous] = useState(initialData?.is_anonymous ?? false);
  const [startDate, setStartDate] = useState<Date>(
    initialData?.start_date ? new Date(initialData.start_date) : new Date()
  );
  const [endDate, setEndDate] = useState<Date>(
    initialData?.end_date ? new Date(initialData.end_date) : addDays(new Date(), 14)
  );
  const [questions, setQuestions] = useState<SurveyQuestion[]>(
    initialData?.questions || []
  );

  // Recurrence state
  const [isRecurring, setIsRecurring] = useState(initialData?.is_recurring ?? false);
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern | null>(
    initialData?.recurrence_pattern || null
  );
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | null>(
    initialData?.recurrence_end_date ? new Date(initialData.recurrence_end_date) : null
  );
  const [customRecurrenceDates, setCustomRecurrenceDates] = useState<CustomRecurrenceDate[] | null>(
    Array.isArray(initialData?.custom_recurrence_dates) 
      ? initialData.custom_recurrence_dates as unknown as CustomRecurrenceDate[]
      : null
  );

  // Reminder state
  const [reminderEnabled, setReminderEnabled] = useState(initialData?.reminder_enabled ?? false);
  const [reminderDaysBefore, setReminderDaysBefore] = useState<number[]>(
    initialData?.reminder_days_before || []
  );

  // Template modal
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  useEffect(() => {
    if (templateQuestions && !initialData) {
      setQuestions(
        templateQuestions.map((q, idx) => ({
          id: `temp-${idx}`,
          survey_id: "",
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options,
          required: q.required,
          position: q.position,
          created_at: new Date().toISOString(),
        }))
      );
    }
  }, [templateQuestions, initialData]);

  const handleSave = async () => {
    await onSave({
      title,
      description,
      category: category || null,
      is_anonymous: isAnonymous,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      template_id: template?.id || null,
      questions,
      // Recurrence
      is_recurring: isRecurring,
      recurrence_pattern: isRecurring ? recurrencePattern : null,
      recurrence_end_date: isRecurring && recurrenceEndDate ? recurrenceEndDate.toISOString() : null,
      custom_recurrence_dates: isRecurring && recurrencePattern === 'custom' ? customRecurrenceDates : null,
      // Reminders
      reminder_enabled: reminderEnabled,
      reminder_days_before: reminderEnabled ? reminderDaysBefore : [],
    });
  };

  const handleSaveAsTemplate = async (name: string, description: string) => {
    if (initialData?.id && onSaveAsTemplate) {
      await onSaveAsTemplate(initialData.id, name, description);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex items-center gap-2">
          {initialData?.id && onSaveAsTemplate && (
            <Button variant="outline" onClick={() => setShowTemplateModal(true)}>
              <BookmarkPlus className="h-4 w-4 mr-2" />
              Salvar como Modelo
            </Button>
          )}
          <Button variant="outline" onClick={handleSave} disabled={isSaving || !title}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Rascunho
          </Button>
          {initialData?.id && onPublish && initialData.status === 'draft' && (
            <Button onClick={() => onPublish(initialData.id)} disabled={isSaving}>
              <Send className="h-4 w-4 mr-2" />
              Publicar
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configurações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nome do questionário"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o objetivo do questionário"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as SurveyCategory)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Respostas Anônimas</Label>
                  <p className="text-xs text-muted-foreground">
                    Não identificar quem respondeu
                  </p>
                </div>
                <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? formatBRT(startDate, "dd/MM/yy") : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(d) => d && setStartDate(d)}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? formatBRT(endDate, "dd/MM/yy") : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(d) => d && setEndDate(d)}
                        locale={ptBR}
                        disabled={(date) => date < startDate}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>

          <SurveyRecurrenceSettings
            isRecurring={isRecurring}
            recurrencePattern={recurrencePattern}
            recurrenceEndDate={recurrenceEndDate}
            startDate={startDate}
            endDate={endDate}
            customRecurrenceDates={customRecurrenceDates}
            onChange={({ isRecurring: ir, recurrencePattern: rp, recurrenceEndDate: red, customRecurrenceDates: crd }) => {
              setIsRecurring(ir);
              setRecurrencePattern(rp);
              setRecurrenceEndDate(red);
              setCustomRecurrenceDates(crd || null);
            }}
          />

          <SurveyReminderSettings
            reminderEnabled={reminderEnabled}
            reminderDaysBefore={reminderDaysBefore}
            onChange={({ reminderEnabled: re, reminderDaysBefore: rdb }) => {
              setReminderEnabled(re);
              setReminderDaysBefore(rdb);
            }}
          />
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Perguntas</CardTitle>
            </CardHeader>
            <CardContent>
              <SurveyQuestionEditor
                questions={questions}
                onChange={setQuestions}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <TemplateSaveModal
        open={showTemplateModal}
        onOpenChange={setShowTemplateModal}
        onSave={handleSaveAsTemplate}
        defaultName={title ? `Modelo: ${title}` : ""}
        isSaving={isSaving}
      />
    </div>
  );
}
