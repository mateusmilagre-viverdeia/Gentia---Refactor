import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { JobFamilyCard } from "./JobFamilyCard";
import { EmptyState } from "./EmptyState";
import type { JobFamilyWithPositions } from "@/types/compensation.types";

interface PositionListProps {
  families: JobFamilyWithPositions[];
  onAddFamily: () => void;
  onEditFamily: (familyId: string) => void;
  onDeleteFamily: (familyId: string) => void;
  onAddPosition: (familyId: string) => void;
  onEditPosition: (positionId: string) => void;
  onDeletePosition: (positionId: string) => void;
}

export const PositionList = ({
  families,
  onAddFamily,
  onEditFamily,
  onDeleteFamily,
  onAddPosition,
  onEditPosition,
  onDeletePosition,
}: PositionListProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Filtrar famílias e cargos
  const filteredFamilies = families
    .map((family) => ({
      ...family,
      positions: family.positions.filter(
        (pos) =>
          pos.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pos.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pos.area?.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    }))
    .filter(
      (family) =>
        family.positions.length > 0 ||
        family.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const totalPositions = families.reduce((acc, f) => acc + f.positions.length, 0);

  if (families.length === 0) {
    return (
      <EmptyState
        title="Nenhuma família de cargos"
        description="Comece criando famílias para organizar seus cargos. Ex: Engenharia, Comercial, Operações."
        actionLabel="Criar Família"
        onAction={onAddFamily}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cargos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {families.length} {families.length === 1 ? "família" : "famílias"} •{" "}
            {totalPositions} {totalPositions === 1 ? "cargo" : "cargos"}
          </span>
          <Button onClick={onAddFamily} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nova Família
          </Button>
        </div>
      </div>

      {/* Lista de Famílias */}
      <div className="space-y-4">
        {filteredFamilies.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum resultado para "{searchTerm}"
          </div>
        ) : (
          filteredFamilies.map((family) => (
            <JobFamilyCard
              key={family.id}
              family={family}
              onEdit={() => onEditFamily(family.id)}
              onDelete={() => onDeleteFamily(family.id)}
              onAddPosition={() => onAddPosition(family.id)}
              onEditPosition={onEditPosition}
              onDeletePosition={onDeletePosition}
            />
          ))
        )}
      </div>
    </div>
  );
};
