import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Filter } from "lucide-react";
import { TimeEntryCard } from "./TimeEntryCard";
import type { TimeEntryWithRelations, TimeEntryCategory } from "@/types/time-tracking.types";
import { TIME_CATEGORY_LABELS, TIME_CATEGORIES } from "@/types/time-tracking.types";

interface TimeEntryListProps {
  entries: TimeEntryWithRelations[];
  onEdit?: (entry: TimeEntryWithRelations) => void;
  onDelete?: (id: string) => void;
  onAdd?: () => void;
  title?: string;
  maxHeight?: string;
}

export function TimeEntryList({
  entries,
  onEdit,
  onDelete,
  onAdd,
  title = "Registros de Tempo",
  maxHeight = "600px",
}: TimeEntryListProps) {
  const [categoryFilter, setCategoryFilter] = useState<TimeEntryCategory | "all">("all");

  const filteredEntries = categoryFilter === "all"
    ? entries
    : entries.filter((entry) => entry.category === categoryFilter);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <div className="flex items-center gap-2">
            <Select
              value={categoryFilter}
              onValueChange={(v) => setCategoryFilter(v as TimeEntryCategory | "all")}
            >
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {TIME_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {TIME_CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {onAdd && (
              <Button onClick={onAdd} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Novo
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-muted-foreground mb-4">
              Nenhum registro de tempo encontrado
            </p>
            {onAdd && (
              <Button onClick={onAdd} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Registrar tempo
              </Button>
            )}
          </div>
        ) : (
          <ScrollArea style={{ maxHeight }}>
            <div className="space-y-3 pr-4">
              {filteredEntries.map((entry) => (
                <TimeEntryCard
                  key={entry.id}
                  entry={entry}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
