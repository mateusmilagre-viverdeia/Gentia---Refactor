import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { PulseSurveyCard } from "./PulseSurveyCard";
import type { PulseSurvey } from "@/types/pulseSurvey.types";

interface PulseSurveyListProps {
  surveys: PulseSurvey[];
  onEdit: (survey: PulseSurvey) => void;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onClose: (id: string) => void;
  onViewResults: (survey: PulseSurvey) => void;
  onDuplicate?: (survey: PulseSurvey) => void;
}

export function PulseSurveyList({
  surveys,
  onEdit,
  onDelete,
  onPublish,
  onPause,
  onResume,
  onClose,
  onViewResults,
  onDuplicate,
}: PulseSurveyListProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filteredSurveys = surveys.filter((s) => {
    const matchesSearch = s.title.toLowerCase().includes(search.toLowerCase());
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "draft" && s.status === "draft") ||
      (activeTab === "active" && s.status === "active") ||
      (activeTab === "paused" && s.status === "paused") ||
      (activeTab === "closed" && s.status === "closed");
    return matchesSearch && matchesTab;
  });

  const counts = {
    all: surveys.length,
    draft: surveys.filter((s) => s.status === "draft").length,
    active: surveys.filter((s) => s.status === "active").length,
    paused: surveys.filter((s) => s.status === "paused").length,
    closed: surveys.filter((s) => s.status === "closed").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar pesquisa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Todos ({counts.all})</TabsTrigger>
          <TabsTrigger value="draft">Rascunhos ({counts.draft})</TabsTrigger>
          <TabsTrigger value="active">Ativos ({counts.active})</TabsTrigger>
          <TabsTrigger value="paused">Pausados ({counts.paused})</TabsTrigger>
          <TabsTrigger value="closed">Encerrados ({counts.closed})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredSurveys.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhuma pesquisa encontrada</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSurveys.map((survey) => (
                <PulseSurveyCard
                  key={survey.id}
                  survey={survey}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onPublish={onPublish}
                  onPause={onPause}
                  onResume={onResume}
                  onClose={onClose}
                  onViewResults={onViewResults}
                  onDuplicate={onDuplicate}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
