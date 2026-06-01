import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { HubHeader } from "@/components/hub/HubHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Calendar, 
  List, 
  BarChart3, 
  Clock, 
  CheckCircle2, 
  Users2,
  CalendarDays,
  AlertCircle,
  ArrowRight,
  FileText
} from "lucide-react";
import { useOneOnOneMeetings } from "@/hooks/useOneOnOneMeetings";
import { isToday, isTomorrow, isPast, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { TemplateManager } from "@/components/retencao/one-on-one";
import { OneOnOneDashboard } from "@/components/retencao/one-on-one/dashboard";
import { formatBRT } from "@/lib/datetime";

const OneOnOneHub = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("lista");
  const { 
    meetings, 
    upcomingMeetings, 
    pastMeetings, 
    isLoading,
    templates,
    recurrences,
    analytics,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    isCreatingTemplate,
  } = useOneOnOneMeetings();

  // Metrics
  const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  
  const meetingsThisWeek = meetings.filter((m) => 
    isWithinInterval(new Date(m.scheduled_at), { start: thisWeekStart, end: thisWeekEnd })
  );

  const completedThisWeek = meetingsThisWeek.filter((m) => m.status === "completed").length;
  const scheduledThisWeek = meetingsThisWeek.length;

  const nextMeeting = upcomingMeetings[0];

  const getStatusBadge = (status: string, scheduledAt: string) => {
    if (status === "completed") {
      return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Concluída</Badge>;
    }
    if (status === "cancelled") {
      return <Badge variant="outline" className="bg-muted text-muted-foreground">Cancelada</Badge>;
    }
    if (isPast(new Date(scheduledAt))) {
      return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">Atrasada</Badge>;
    }
    if (isToday(new Date(scheduledAt))) {
      return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">Hoje</Badge>;
    }
    if (isTomorrow(new Date(scheduledAt))) {
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Amanhã</Badge>;
    }
    return <Badge variant="outline">Agendada</Badge>;
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "?";
  };

  const formatMeetingDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return `Hoje às ${formatBRT(date, "HH:mm")}`;
    if (isTomorrow(date)) return `Amanhã às ${formatBRT(date, "HH:mm")}`;
    return formatBRT(date, "dd/MM 'às' HH:mm");
  };

  return (
    <AppLayout
      title="Reuniões 1:1"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Retenção", href: "/retencao" },
        { label: "Reuniões 1:1" }
      ]}
    >
      <div className="space-y-6">
        <HubHeader
          title="Reuniões 1:1"
          description="Agende e documente reuniões individuais com sua equipe"
        >
          <Button onClick={() => navigate("/retencao/reunioes-1-1/nova")}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Reunião
          </Button>
        </HubHeader>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Esta Semana
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-semibold">
                  {completedThisWeek}/{scheduledThisWeek}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">reuniões realizadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Próxima Reunião
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : nextMeeting ? (
                <>
                  <div className="text-lg font-medium truncate">
                    {nextMeeting.collaborator?.first_name || "Colaborador"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatMeetingDate(nextMeeting.scheduled_at)}
                  </p>
                </>
              ) : (
                <div className="text-muted-foreground text-sm">Nenhuma agendada</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Users2 className="h-4 w-4" />
                Séries Ativas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-semibold">
                  {recurrences.filter((r) => r.is_active).length}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">recorrências configuradas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-semibold">{templates.length}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">modelos de pauta</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Lista, Calendário, Templates, Dashboard */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="lista" className="gap-2">
              <List className="h-4 w-4" />
              Lista
            </TabsTrigger>
            <TabsTrigger value="calendario" className="gap-2">
              <Calendar className="h-4 w-4" />
              Calendário
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <FileText className="h-4 w-4" />
              Modelos
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lista" className="mt-4">
            <div className="space-y-6">
              {/* Upcoming Meetings */}
              <div>
                <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Próximas Reuniões
                </h3>
                {isLoading ? (
                  <div className="grid gap-3">
                    {[1, 2, 3].map((i) => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <Skeleton className="h-16 w-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : upcomingMeetings.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="p-8 text-center">
                      <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground mb-4">
                        Nenhuma reunião agendada
                      </p>
                      <Button onClick={() => navigate("/retencao/reunioes-1-1/nova")}>
                        <Plus className="h-4 w-4 mr-2" />
                        Agendar Primeira Reunião
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-3">
                    {upcomingMeetings.slice(0, 5).map((meeting) => (
                      <Card 
                        key={meeting.id} 
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => navigate(`/retencao/reunioes-1-1/${meeting.id}`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={meeting.collaborator?.avatar_url || undefined} />
                                <AvatarFallback>
                                  {getInitials(
                                    meeting.collaborator?.first_name,
                                    meeting.collaborator?.last_name
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {meeting.collaborator?.first_name} {meeting.collaborator?.last_name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {formatMeetingDate(meeting.scheduled_at)} • {meeting.duration_minutes} min
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {getStatusBadge(meeting.status, meeting.scheduled_at)}
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Past Meetings */}
              {pastMeetings.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Reuniões Anteriores
                  </h3>
                  <div className="grid gap-3">
                    {pastMeetings.slice(0, 5).map((meeting) => (
                      <Card 
                        key={meeting.id} 
                        className="hover:shadow-md transition-shadow cursor-pointer opacity-80"
                        onClick={() => navigate(`/retencao/reunioes-1-1/${meeting.id}`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={meeting.collaborator?.avatar_url || undefined} />
                                <AvatarFallback>
                                  {getInitials(
                                    meeting.collaborator?.first_name,
                                    meeting.collaborator?.last_name
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {meeting.collaborator?.first_name} {meeting.collaborator?.last_name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {formatBRT(new Date(meeting.scheduled_at), "dd/MM/yyyy 'às' HH:mm")}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {getStatusBadge(meeting.status, meeting.scheduled_at)}
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="calendario" className="mt-4">
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Visualização de Calendário</h3>
                <p className="text-muted-foreground">
                  Em breve: visualize suas reuniões em formato de calendário mensal
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="mt-4">
            <Card>
              <CardContent className="p-6">
                <TemplateManager
                  templates={templates}
                  onCreateTemplate={createTemplate}
                  onUpdateTemplate={(id, data) => updateTemplate({ id, ...data })}
                  onDeleteTemplate={deleteTemplate}
                  isLoading={isCreatingTemplate}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dashboard" className="mt-4">
            <OneOnOneDashboard 
              analytics={analytics} 
              meetings={meetings}
              isLoading={isLoading}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default OneOnOneHub;
