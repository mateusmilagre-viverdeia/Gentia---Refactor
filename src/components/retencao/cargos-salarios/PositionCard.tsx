import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2, Layers, Target, AlertCircle } from "lucide-react";
import type { PositionWithLevels } from "@/types/compensation.types";

interface PositionCardProps {
  position: PositionWithLevels;
  onEdit: () => void;
  onDelete: () => void;
}

export const PositionCard = ({ position, onEdit, onDelete }: PositionCardProps) => {
  const levelCount = position.levels?.length || 0;
  const hasMission = !!position.mission;
  const hasLevels = levelCount > 0;

  // Verificar completude
  const completeness = {
    value: hasMission,
    architecture: !!position.area,
    levels: hasLevels,
  };
  const completenessScore = Object.values(completeness).filter(Boolean).length;
  const isIncomplete = completenessScore < 3;

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium">{position.name}</h4>
              {position.code && (
                <Badge variant="outline" className="text-xs">
                  {position.code}
                </Badge>
              )}
              {isIncomplete && (
                <Badge variant="secondary" className="text-xs text-amber-600 bg-amber-50">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Incompleto
                </Badge>
              )}
            </div>

            {position.mission && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {position.mission}
              </p>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {position.area && (
                <span className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {position.area}
                  {position.sub_area && ` / ${position.sub_area}`}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {levelCount} {levelCount === 1 ? "nível" : "níveis"}
              </span>
            </div>

            {hasLevels && (
              <div className="flex flex-wrap gap-1 mt-2">
                {position.levels.map((level) => (
                  <Badge key={level.id} variant="secondary" className="text-xs">
                    {level.code}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Editar Cargo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Remover Cargo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};
