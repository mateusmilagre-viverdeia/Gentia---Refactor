import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { Clock, MoreVertical, Pencil, Trash2, Building2 } from "lucide-react";
import type { TimeEntryWithRelations } from "@/types/time-tracking.types";
import { TIME_CATEGORY_LABELS, TIME_CATEGORY_COLORS, formatDuration } from "@/types/time-tracking.types";
import { formatBRT } from "@/lib/datetime";

interface TimeEntryCardProps {
  entry: TimeEntryWithRelations;
  onEdit?: (entry: TimeEntryWithRelations) => void;
  onDelete?: (id: string) => void;
}

export function TimeEntryCard({ entry, onEdit, onDelete }: TimeEntryCardProps) {
  const categoryColor = TIME_CATEGORY_COLORS[entry.category];

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          {/* Header with project and date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span className="font-medium text-foreground">
              {entry.account?.name || "Projeto"}
            </span>
            <span>•</span>
            <span>
              {formatBRT(new Date(entry.entry_date), "dd 'de' MMMM")}
            </span>
          </div>

          {/* Category and Duration */}
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              style={{ borderColor: categoryColor, color: categoryColor }}
            >
              {TIME_CATEGORY_LABELS[entry.category]}
            </Badge>
            <div className="flex items-center gap-1 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{formatDuration(entry.duration_minutes)}</span>
            </div>
            {entry.start_time && entry.end_time && (
              <span className="text-xs text-muted-foreground">
                {entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}
              </span>
            )}
            {!entry.billable && (
              <Badge variant="secondary" className="text-xs">
                Não faturável
              </Badge>
            )}
          </div>

          {/* Description */}
          {entry.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {entry.description}
            </p>
          )}

          {/* Checkpoint link */}
          {entry.checkpoint && (
            <p className="text-xs text-muted-foreground">
              Checkpoint: {entry.checkpoint.topic}
            </p>
          )}
        </div>

        {/* Actions */}
        {(onEdit || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(entry)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(entry.id)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </Card>
  );
}
