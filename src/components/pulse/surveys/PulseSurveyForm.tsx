import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import type { PulseSurvey, CreatePulseSurveyData, PulseSurveyFrequency } from "@/types/pulseSurvey.types";
import type { PulseDriver, PulseQuestion } from "@/types/pulse.types";
import { FREQUENCY_LABELS, WEEKDAY_LABELS } from "@/types/pulseSurvey.types";

interface PulseSurveyFormProps {
  initialData?: PulseSurvey;
  drivers: PulseDriver[];
  teams: { id: string; name: string }[];
  questions: PulseQuestion[];
  onSave: (data: CreatePulseSurveyData) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

const STEPS = [
  { key: 'drivers', title: 'Drivers de Engajamento', description: 'Selecione os drivers que serão avaliados' },
  { key: 'teams', title: 'Equipes', description: 'Escolha quem irá responder' },
  { key: 'frequency', title: 'Frequência e Horário', description: 'Configure quando enviar' },
  { key: 'rules', title: 'Regras de Envio', description: 'Defina as regras das perguntas' },
  { key: 'questions', title: 'Perguntas', description: 'Selecione as perguntas' },
];

export function PulseSurveyForm({
  initialData,
  drivers,
  teams,
  questions,
  onSave,
  onCancel,
  isSaving,
}: PulseSurveyFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  // Form state
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [selectedDriverKeys, setSelectedDriverKeys] = useState<string[]>(initialData?.selected_driver_keys || []);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(initialData?.selected_team_ids || []);
  const [allTeams, setAllTeams] = useState(initialData?.all_teams ?? true);
  const [frequency, setFrequency] = useState<PulseSurveyFrequency>(initialData?.frequency || 'daily');
  const [sendTime, setSendTime] = useState(initialData?.send_time || '09:00');
  const [sendDays, setSendDays] = useState<number[]>(initialData?.send_days || [1, 2, 3, 4, 5]);
  const [startDate, setStartDate] = useState(initialData?.start_date || '');
  const [endDate, setEndDate] = useState(initialData?.end_date || '');
  const [questionsPerDay, setQuestionsPerDay] = useState(initialData?.questions_per_day || 3);
  const [blockRepeatDays, setBlockRepeatDays] = useState(initialData?.block_repeat_days || 7);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>(initialData?.selected_question_ids || []);

  // Filter questions by selected drivers
  const filteredQuestions = questions.filter(q => {
    if (!q.pulse_drivers) return false;
    return selectedDriverKeys.includes(q.pulse_drivers.key);
  });

  const activeDrivers = drivers.filter(d => d.is_active);

  const toggleDriver = (key: string) => {
    setSelectedDriverKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
    // Clear questions when drivers change
    setSelectedQuestionIds([]);
  };

  const toggleTeam = (id: string) => {
    setSelectedTeamIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleDay = (day: number) => {
    setSendDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const toggleQuestion = (id: string) => {
    setSelectedQuestionIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAllQuestions = () => {
    setSelectedQuestionIds(filteredQuestions.map(q => q.id));
  };

  const deselectAllQuestions = () => {
    setSelectedQuestionIds([]);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return title.trim() !== '' && selectedDriverKeys.length > 0;
      case 1: return allTeams || selectedTeamIds.length > 0;
      case 2: return frequency && sendTime;
      case 3: return questionsPerDay >= 1 && questionsPerDay <= 10;
      case 4: return selectedQuestionIds.length > 0;
      default: return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async () => {
    const data: CreatePulseSurveyData = {
      title,
      description: description || undefined,
      selected_driver_keys: selectedDriverKeys,
      selected_team_ids: allTeams ? [] : selectedTeamIds,
      all_teams: allTeams,
      frequency,
      send_time: sendTime,
      send_days: sendDays,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      questions_per_day: questionsPerDay,
      block_repeat_days: blockRepeatDays,
      selected_question_ids: selectedQuestionIds,
    };
    
    await onSave(data);
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header with progress */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-medium">
              Passo {currentStep + 1} de {STEPS.length}: {STEPS[currentStep].title}
            </h2>
            <span className="text-sm text-muted-foreground">
              {Math.round(progress)}% completo
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Step content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep].title}</CardTitle>
          <CardDescription>{STEPS[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Drivers */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Nome da Pesquisa *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Pulse Semanal de Engajamento"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o objetivo desta pesquisa..."
                />
              </div>
              <div className="space-y-3">
                <Label>Drivers de Engajamento *</Label>
                <p className="text-sm text-muted-foreground">
                  Selecione os temas que serão avaliados nesta pesquisa
                </p>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {activeDrivers.map(driver => {
                    const questionCount = questions.filter(q => 
                      q.pulse_drivers?.key === driver.key
                    ).length;
                    
                    return (
                      <div
                        key={driver.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedDriverKeys.includes(driver.key)
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => toggleDriver(driver.key)}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedDriverKeys.includes(driver.key)}
                            onCheckedChange={() => toggleDriver(driver.key)}
                          />
                          <div className="flex-1">
                            <p className="font-medium">{driver.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {questionCount} perguntas disponíveis
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {selectedDriverKeys.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {selectedDriverKeys.length} driver(s) selecionado(s)
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Teams */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>Destinatários</Label>
                <RadioGroup
                  value={allTeams ? 'all' : 'select'}
                  onValueChange={(v) => setAllTeams(v === 'all')}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all-teams" />
                    <Label htmlFor="all-teams" className="font-normal cursor-pointer">
                      Todas as equipes
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="select" id="select-teams" />
                    <Label htmlFor="select-teams" className="font-normal cursor-pointer">
                      Selecionar equipes específicas
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {!allTeams && (
                <div className="space-y-3">
                  <Label>Equipes</Label>
                  {teams.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma equipe cadastrada. Configure equipes em Administração.
                    </p>
                  ) : (
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {teams.map(team => (
                        <div
                          key={team.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedTeamIds.includes(team.id)
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => toggleTeam(team.id)}
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedTeamIds.includes(team.id)}
                              onCheckedChange={() => toggleTeam(team.id)}
                            />
                            <span>{team.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Frequency */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>Frequência de Envio</Label>
                <RadioGroup
                  value={frequency}
                  onValueChange={(v) => setFrequency(v as PulseSurveyFrequency)}
                  className="grid gap-3 md:grid-cols-2"
                >
                  {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <RadioGroupItem value={key} id={`freq-${key}`} />
                      <Label htmlFor={`freq-${key}`} className="font-normal cursor-pointer">
                        {label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {frequency !== 'daily' && (
                <div className="space-y-3">
                  <Label>Dias da Semana</Label>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(WEEKDAY_LABELS).map(([day, label]) => (
                      <Button
                        key={day}
                        type="button"
                        variant={sendDays.includes(Number(day)) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleDay(Number(day))}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="send-time">Horário de Envio</Label>
                <Input
                  id="send-time"
                  type="time"
                  value={sendTime}
                  onChange={(e) => setSendTime(e.target.value)}
                  className="max-w-[150px]"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Data de Início (opcional)</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">Data de Término (opcional)</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Rules */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="questions-per-day">Perguntas por Dia</Label>
                <p className="text-sm text-muted-foreground">
                  Quantas perguntas serão enviadas a cada ciclo
                </p>
                <Select
                  value={String(questionsPerDay)}
                  onValueChange={(v) => setQuestionsPerDay(Number(v))}
                >
                  <SelectTrigger className="max-w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <SelectItem key={n} value={String(n)}>
                        {n} {n === 1 ? 'pergunta' : 'perguntas'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="block-repeat">Bloquear Repetição</Label>
                <p className="text-sm text-muted-foreground">
                  Quantos dias uma pergunta deve aguardar antes de aparecer novamente
                </p>
                <Select
                  value={String(blockRepeatDays)}
                  onValueChange={(v) => setBlockRepeatDays(Number(v))}
                >
                  <SelectTrigger className="max-w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sem bloqueio</SelectItem>
                    <SelectItem value="3">3 dias</SelectItem>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="14">14 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 5: Questions */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {filteredQuestions.length} perguntas disponíveis para os drivers selecionados
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAllQuestions}
                  >
                    Selecionar Todas
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={deselectAllQuestions}
                  >
                    Limpar
                  </Button>
                </div>
              </div>

              {selectedQuestionIds.length > 0 && (
                <Badge variant="secondary">
                  {selectedQuestionIds.length} pergunta(s) selecionada(s)
                </Badge>
              )}

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredQuestions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma pergunta disponível. Selecione drivers no passo 1.
                  </p>
                ) : (
                  filteredQuestions.map(question => (
                    <div
                      key={question.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedQuestionIds.includes(question.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => toggleQuestion(question.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedQuestionIds.includes(question.id)}
                          onCheckedChange={() => toggleQuestion(question.id)}
                        />
                        <div className="flex-1">
                          <p className="text-sm">{question.question_text}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {question.pulse_drivers?.name}
                            </Badge>
                            {question.account_id === null && (
                              <Badge variant="secondary" className="text-xs">
                                🏢 Sistema
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>

        {currentStep === STEPS.length - 1 ? (
          <Button
            onClick={handleSave}
            disabled={!canProceed() || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Salvar Pesquisa
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
          >
            Próximo
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
