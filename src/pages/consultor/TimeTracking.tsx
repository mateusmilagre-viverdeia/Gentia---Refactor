import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Clock, Calendar, BarChart3, FileText, Table } from "lucide-react";
import { useConsultantTimeTracking } from "@/hooks/useConsultantTimeTracking";
import { useConsultantAssignments } from "@/hooks/useConsultantAssignments";
import { formatBRT } from "@/lib/datetime";
import {
  TimeEntryDialog,
  TimeEntryList,
  TimeSummaryCard,
  TimeByCategoryChart,
  TimeByProjectChart,
  WeeklyTimesheetView,
  StartTimerButton,
  ActiveTimerWidget,
} from "@/components/consultor/time-tracking";
import { generateTimeReport, generateConsultantTimeReportCSV } from "@/utils/generateTimeReport";
import type { TimeEntryWithRelations, CreateTimeEntryInput, UpdateTimeEntryInput, TimeFilters } from "@/types/time-tracking.types";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type Period = "week" | "month" | "30d" | "all";

export default function TimeTracking() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntryWithRelations | null>(null);
  const [period, setPeriod] = useState<Period>("week");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Calculate date filters based on period
  const filters = useMemo((): TimeFilters => {
    const now = new Date();
    switch (period) {
      case "week":
        return {
          startDate: formatBRT(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
          endDate: formatBRT(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        };
      case "month":
        return {
          startDate: formatBRT(startOfMonth(now), "yyyy-MM-dd"),
          endDate: formatBRT(endOfMonth(now), "yyyy-MM-dd"),
        };
      case "30d":
        return {
          startDate: formatBRT(subDays(now, 30), "yyyy-MM-dd"),
          endDate: formatBRT(now, "yyyy-MM-dd"),
        };
      default:
        return {};
    }
  }, [period]);

  const {
    entries,
    isLoading,
    createEntry,
    updateEntry,
    deleteEntry,
    isCreating,
    isUpdating,
    getSummary,
    consultant,
  } = useConsultantTimeTracking(filters);

  const { assignments, isLoading: loadingAssignments } = useConsultantAssignments();

  // Get projects from assignments
  const projects = useMemo(() => {
    if (!assignments) return [];
    return assignments.map((a) => ({
      id: a.account_id,
      name: a.account?.name || "Projeto",
    }));
  }, [assignments]);

  const summary = getSummary(entries);

  // Filtered entries for weekly view
  const weeklyFilters = useMemo((): TimeFilters => ({
    startDate: formatBRT(weekStart, "yyyy-MM-dd"),
    endDate: formatBRT(endOfWeek(weekStart, { weekStartsOn: 1 }), "yyyy-MM-dd"),
  }), [weekStart]);

  const { entries: weeklyEntries } = useConsultantTimeTracking(weeklyFilters);

  const periodLabel = {
    week: "Esta Semana",
    month: "Este Mês",
    "30d": "Últimos 30 dias",
    all: "Todo período",
  }[period];

  const handleSave = async (data: CreateTimeEntryInput | UpdateTimeEntryInput) => {
    if (editingEntry) {
      await updateEntry(editingEntry.id, data as UpdateTimeEntryInput);
    } else {
      await createEntry(data as CreateTimeEntryInput);
    }
    setEditingEntry(null);
  };

  const handleEdit = (entry: TimeEntryWithRelations) => {
    setEditingEntry(entry);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingEntry(null);
    setDialogOpen(true);
  };

  const handleExportPDF = () => {
    const now = new Date();
    const start = filters.startDate ? new Date(filters.startDate) : subDays(now, 30);
    const end = filters.endDate ? new Date(filters.endDate) : now;
    
    generateTimeReport({
      entries,
      summary,
      consultantName: consultant?.name || "Consultor",
      startDate: start,
      endDate: end,
      title: `Relatório de Horas - ${periodLabel}`,
    });
  };

  const handleExportCSV = () => {
    generateConsultantTimeReportCSV(entries, consultant?.name || "Consultor");
  };

  if (isLoading || loadingAssignments) {
    return (
      <div className="container py-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Controle de Tempo</h1>
          <p className="text-muted-foreground">Registre e acompanhe o tempo dedicado a cada projeto</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="all">Todo período</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleExportPDF}>
                Exportar PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV}>
                Exportar CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <StartTimerButton />
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Registrar Tempo
          </Button>
        </div>
      </div>

      {/* Active Timer Widget */}
      <ActiveTimerWidget />

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard">
            <BarChart3 className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="weekly">
            <Table className="h-4 w-4 mr-2" />
            Semanal
          </TabsTrigger>
          <TabsTrigger value="entries">
            <Clock className="h-4 w-4 mr-2" />
            Registros
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <TimeSummaryCard summary={summary} period={periodLabel} />
          
          <div className="grid gap-6 md:grid-cols-2">
            <TimeByCategoryChart summary={summary} />
            <TimeByProjectChart summary={summary} />
          </div>
        </TabsContent>

        <TabsContent value="weekly">
          <WeeklyTimesheetView 
            entries={weeklyEntries}
            weekStart={weekStart}
            onWeekChange={setWeekStart}
          />
        </TabsContent>

        <TabsContent value="entries">
          <TimeEntryList
            entries={entries}
            onEdit={handleEdit}
            onDelete={deleteEntry}
            onAdd={handleAdd}
          />
        </TabsContent>
      </Tabs>

      <TimeEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entry={editingEntry}
        projects={projects}
        onSave={handleSave}
        isSaving={isCreating || isUpdating}
      />
    </div>
  );
}
