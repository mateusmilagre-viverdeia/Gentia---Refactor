import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, List, CalendarDays } from "lucide-react";
import { SurveyCard } from "./SurveyCard";
import { SurveyCalendar } from "./SurveyCalendar";
import type { Survey, SurveySchedule } from "@/types/survey.types";

type ViewMode = 'list' | 'calendar';

interface SurveyListProps {
  surveys: Survey[];
  schedules?: SurveySchedule[];
  onEdit: (survey: Survey) => void;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
  onClose: (id: string) => void;
  onViewResults: (survey: Survey) => void;
  onInvite: (survey: Survey) => void;
  onDuplicate?: (survey: Survey) => void;
  onMonthChange?: (date: Date) => void;
  onReactivate?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDraft?: (id: string) => void;
}

export function SurveyList({
  surveys,
  schedules = [],
  onEdit,
  onDelete,
  onPublish,
  onClose,
  onViewResults,
  onInvite,
  onDuplicate,
  onMonthChange,
  onReactivate,
  onArchive,
  onDraft,
}: SurveyListProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const filteredSurveys = surveys.filter((s) => {
    const matchesSearch = s.title.toLowerCase().includes(search.toLowerCase());
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "draft" && s.status === "draft") ||
      (activeTab === "active" && s.status === "active") ||
      (activeTab === "closed" && (s.status === "closed" || s.status === "archived"));
    return matchesSearch && matchesTab;
  });

  const counts = {
    all: surveys.length,
    draft: surveys.filter((s) => s.status === "draft").length,
    active: surveys.filter((s) => s.status === "active").length,
    closed: surveys.filter((s) => s.status === "closed" || s.status === "archived").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar questionário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('calendar')}
          >
            <CalendarDays className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <SurveyCalendar
          data={{ surveys, schedules }}
          onSelectSurvey={onViewResults}
          onMonthChange={onMonthChange || (() => {})}
        />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">Todos ({counts.all})</TabsTrigger>
            <TabsTrigger value="draft">Rascunhos ({counts.draft})</TabsTrigger>
            <TabsTrigger value="active">Ativos ({counts.active})</TabsTrigger>
            <TabsTrigger value="closed">Encerrados ({counts.closed})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {filteredSurveys.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Nenhum questionário encontrado</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredSurveys.map((survey) => (
                  <SurveyCard
                    key={survey.id}
                    survey={survey}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onPublish={onPublish}
                    onClose={onClose}
                    onViewResults={onViewResults}
                    onInvite={onInvite}
                    onDuplicate={onDuplicate}
                    onReactivate={onReactivate}
                    onArchive={onArchive}
                    onDraft={onDraft}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
