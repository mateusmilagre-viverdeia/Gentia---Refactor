import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  ChevronDown, 
  ChevronRight, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Plus,
  Code,
  Users,
  Crown
} from "lucide-react";
import { PositionCard } from "./PositionCard";
import type { JobFamilyWithPositions, CareerTrack } from "@/types/compensation.types";
import { cn } from "@/lib/utils";

interface JobFamilyCardProps {
  family: JobFamilyWithPositions;
  onEdit: () => void;
  onDelete: () => void;
  onAddPosition: () => void;
  onEditPosition: (positionId: string) => void;
  onDeletePosition: (positionId: string) => void;
}

const TRACK_CONFIG: Record<CareerTrack, { icon: React.ElementType; label: string; color: string }> = {
  technical: { icon: Code, label: "Técnico", color: "bg-blue-100 text-blue-700 border-blue-200" },
  leadership: { icon: Crown, label: "Liderança", color: "bg-purple-100 text-purple-700 border-purple-200" },
  specialist: { icon: Users, label: "Especialista", color: "bg-green-100 text-green-700 border-green-200" },
};

export const JobFamilyCard = ({
  family,
  onEdit,
  onDelete,
  onAddPosition,
  onEditPosition,
  onDeletePosition,
}: JobFamilyCardProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const trackConfig = TRACK_CONFIG[family.career_track];
  const TrackIcon = trackConfig.icon;
  const positionCount = family.positions?.length || 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>

            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {family.name}
                <Badge variant="outline" className={cn("text-xs", trackConfig.color)}>
                  <TrackIcon className="h-3 w-3 mr-1" />
                  {trackConfig.label}
                </Badge>
              </CardTitle>
              {family.description && (
                <p className="text-sm text-muted-foreground mt-1">{family.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {positionCount} {positionCount === 1 ? "cargo" : "cargos"}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onAddPosition}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Cargo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Família
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Família
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-4">
          {positionCount === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-2">Nenhum cargo nesta família</p>
              <Button variant="outline" size="sm" onClick={onAddPosition}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Cargo
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {family.positions.map((position) => (
                <PositionCard
                  key={position.id}
                  position={position}
                  onEdit={() => onEditPosition(position.id)}
                  onDelete={() => onDeletePosition(position.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};
