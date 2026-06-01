import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, FileText, BarChart3 } from "lucide-react";
import { useSurveys } from "@/hooks/useSurveys";
import {
  SurveyList,
  SurveyForm,
  SurveyDashboard,
  TemplateSelector,
  SurveyInviteModal,
  SurveyBenchmarkDashboard,
} from "@/components/retencao/questionarios";
import type { Survey, SurveyTemplate, SurveyQuestion, QuestionStats, SurveyStats, SurveyInvitation, SurveySchedule } from "@/types/survey.types";
import type { SurveyInstanceData } from "@/components/retencao/questionarios/SurveyComparisonReport";

type ViewMode = 'list' | 'template' | 'form' | 'dashboard' | 'benchmark';

const Questionarios = () => {
  const {
    surveys,
    templates,
    isLoadingSurveys,
    isLoadingTemplates,
    createSurvey,
    updateSurvey,
    deleteSurvey,
    publishSurvey,
    closeSurvey,
    reactivateSurvey,
    archiveSurvey,
    draftSurvey,
    duplicateSurvey,
    getSurveyWithQuestions,
    getTemplateQuestions,
    sendInvitations,
    sendReminder,
    getSurveyStats,
    getQuestionStats,
    getInvitations,
    saveAsTemplate,
    saveSchedules,
    generateRecurrenceSchedule,
    getCalendarData,
    getRecurringSurveyComparison,
    isCreating,
    isUpdating,
    isDuplicating,
  } = useSurveys();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedTemplate, setSelectedTemplate] = useState<SurveyTemplate | null>(null);
  const [templateQuestions, setTemplateQuestions] = useState<any[]>([]);
  const [editingSurvey, setEditingSurvey] = useState<(Survey & { questions?: SurveyQuestion[] }) | null>(null);
  const [viewingSurvey, setViewingSurvey] = useState<Survey | null>(null);
  const [surveyStats, setSurveyStats] = useState<SurveyStats | null>(null);
  const [questionStats, setQuestionStats] = useState<QuestionStats[]>([]);
  const [invitations, setInvitations] = useState<SurveyInvitation[]>([]);
  const [inviteModalSurvey, setInviteModalSurvey] = useState<Survey | null>(null);
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);
  const [calendarSchedules, setCalendarSchedules] = useState<SurveySchedule[]>([]);
  const [comparisonData, setComparisonData] = useState<SurveyInstanceData[]>([]);
  const [isLoadingComparison, setIsLoadingComparison] = useState(false);

  const handleCreateNew = () => {
    setViewMode('template');
  };

  const handleSelectTemplate = async (template: SurveyTemplate | null) => {
    setSelectedTemplate(template);
    if (template) {
      const questions = await getTemplateQuestions(template.id);
      setTemplateQuestions(questions);
    } else {
      setTemplateQuestions([]);
    }
    setEditingSurvey(null);
    setViewMode('form');
  };

  const handleEdit = async (survey: Survey) => {
    const fullSurvey = await getSurveyWithQuestions(survey.id);
    setEditingSurvey(fullSurvey);
    setSelectedTemplate(null);
    setTemplateQuestions([]);
    setViewMode('form');
  };

  const handleDuplicate = async (survey: Survey) => {
    const newSurvey = await duplicateSurvey(survey.id);
    // Open the duplicated survey for editing
    const fullSurvey = await getSurveyWithQuestions(newSurvey.id);
    setEditingSurvey(fullSurvey);
    setSelectedTemplate(null);
    setTemplateQuestions([]);
    setViewMode('form');
  };

  const handleSave = async (data: any) => {
    let surveyId: string;
    if (editingSurvey?.id) {
      await updateSurvey({ id: editingSurvey.id, ...data });
      surveyId = editingSurvey.id;
    } else {
      const newSurvey = await createSurvey(data);
      surveyId = newSurvey.id;
    }

    // Save schedules if recurring
    if (data.is_recurring && data.recurrence_pattern && data.recurrence_end_date) {
      const schedules = generateRecurrenceSchedule(
        new Date(data.start_date),
        new Date(data.end_date),
        data.recurrence_pattern,
        new Date(data.recurrence_end_date)
      );
      if (schedules.length > 0) {
        await saveSchedules({ surveyId, schedules });
      }
    }

    setViewMode('list');
    setEditingSurvey(null);
    setSelectedTemplate(null);
  };

  const handleSaveAsTemplate = async (surveyId: string, name: string, description: string) => {
    await saveAsTemplate({ surveyId, name, description });
  };

  const handleViewResults = async (survey: Survey) => {
    setViewingSurvey(survey);
    setComparisonData([]);
    
    const [stats, qStats, invs] = await Promise.all([
      getSurveyStats(survey.id),
      getQuestionStats(survey.id),
      getInvitations(survey.id),
    ]);
    setSurveyStats(stats);
    setQuestionStats(qStats);
    setInvitations(invs);
    setViewMode('dashboard');

    // Load comparison data if recurring
    if (survey.is_recurring || survey.parent_survey_id) {
      setIsLoadingComparison(true);
      try {
        const parentId = survey.parent_survey_id || survey.id;
        const instances = await getRecurringSurveyComparison(parentId);
        setComparisonData(instances);
      } catch (error) {
        console.error('Error loading comparison data:', error);
      } finally {
        setIsLoadingComparison(false);
      }
    }
  };

  const handleBack = () => {
    setViewMode('list');
    setEditingSurvey(null);
    setSelectedTemplate(null);
    setViewingSurvey(null);
    setComparisonData([]);
  };

  const handleDelete = async () => {
    if (deleteDialogId) {
      await deleteSurvey(deleteDialogId);
      setDeleteDialogId(null);
    }
  };

  const handleSendInvitations = async (surveyId: string, userIds: string[]) => {
    await sendInvitations({ surveyId, userIds });
    if (viewingSurvey?.id === surveyId) {
      const invs = await getInvitations(surveyId);
      setInvitations(invs);
      const stats = await getSurveyStats(surveyId);
      setSurveyStats(stats);
    }
  };

  const handleMonthChange = async (date: Date) => {
    try {
      const data = await getCalendarData(date);
      setCalendarSchedules(data.schedules);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    }
  };

  return (
    <AppLayout
      title="Questionários"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Retenção", href: "/retencao" },
        { label: "Questionários" },
      ]}
    >
      <div className="space-y-6">
        {viewMode === 'list' && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-semibold mb-2">Questionários</h1>
                <p className="text-muted-foreground">
                  Crie e gerencie pesquisas personalizadas para sua equipe
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setViewMode('benchmark')}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Benchmark
                </Button>
                <Button onClick={handleCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Questionário
                </Button>
              </div>
            </div>

            {isLoadingSurveys ? (
              <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            ) : surveys.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h2 className="text-xl font-medium mb-2">Nenhum questionário ainda</h2>
                <p className="text-muted-foreground mb-6">
                  Crie seu primeiro questionário para coletar feedback da equipe
                </p>
                <Button onClick={handleCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Questionário
                </Button>
              </div>
            ) : (
              <SurveyList
                surveys={surveys}
                schedules={calendarSchedules}
                onEdit={handleEdit}
                onDelete={(id) => setDeleteDialogId(id)}
                onPublish={publishSurvey}
                onClose={closeSurvey}
                onViewResults={handleViewResults}
                onInvite={(s) => setInviteModalSurvey(s)}
                onDuplicate={handleDuplicate}
                onMonthChange={handleMonthChange}
                onReactivate={reactivateSurvey}
                onArchive={archiveSurvey}
                onDraft={draftSurvey}
              />
            )}
          </>
        )}

        {viewMode === 'template' && (
          <div className="max-w-2xl mx-auto">
            <Button variant="ghost" onClick={handleBack} className="mb-4">
              ← Voltar
            </Button>
            <TemplateSelector
              templates={templates}
              onSelect={handleSelectTemplate}
              isLoading={isLoadingTemplates}
            />
          </div>
        )}

        {viewMode === 'form' && (
          <SurveyForm
            initialData={editingSurvey || undefined}
            template={selectedTemplate}
            templateQuestions={templateQuestions}
            onSave={handleSave}
            onPublish={async (id) => { await publishSurvey(id); }}
            onSaveAsTemplate={handleSaveAsTemplate}
            onCancel={handleBack}
            isSaving={isCreating || isUpdating}
          />
        )}

        {viewMode === 'dashboard' && viewingSurvey && (
          <SurveyDashboard
            survey={viewingSurvey}
            stats={surveyStats}
            questionStats={questionStats}
            invitations={invitations}
            onBack={handleBack}
            onSendReminder={async (userId) => {
              if (viewingSurvey) {
                await sendReminder({ surveyId: viewingSurvey.id, userId });
              }
            }}
            comparisonData={comparisonData}
            isLoadingComparison={isLoadingComparison}
          />
        )}

        {viewMode === 'benchmark' && (
          <SurveyBenchmarkDashboard onBack={handleBack} />
        )}
      </div>

      <SurveyInviteModal
        survey={inviteModalSurvey}
        open={!!inviteModalSurvey}
        onClose={() => setInviteModalSurvey(null)}
        onSend={handleSendInvitations}
      />

      <AlertDialog open={!!deleteDialogId} onOpenChange={() => setDeleteDialogId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir questionário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todas as respostas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Questionarios;
