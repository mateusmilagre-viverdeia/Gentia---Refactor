import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useOrganizationProfiles } from "@/hooks/useEmployeePositions";
import { useCompensationModels } from "@/hooks/useCompensationModels";
import { supabase } from "@/integrations/supabase/client";
import type { EmployeePositionWithDetails } from "@/hooks/useEmployeePositions";
import type { CreateEmployeePositionInput, ChangeType } from "@/types/compensation.types";

interface EmployeePositionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modelId: string;
  employee?: EmployeePositionWithDetails | null;
  onSubmit: (data: CreateEmployeePositionInput & { 
    salary_range?: { minimum: number; maximum: number };
    change_type?: ChangeType;
    reason?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

interface LevelWithRange {
  id: string;
  code: string;
  name: string;
  level_order: number;
  position_id: string;
  salary_range: {
    minimum: number;
    midpoint: number;
    maximum: number;
  } | null;
}

export function EmployeePositionForm({
  open,
  onOpenChange,
  modelId,
  employee,
  onSubmit,
  isLoading,
}: EmployeePositionFormProps) {
  const { data: profiles, isLoading: loadingProfiles } = useOrganizationProfiles();
  const { useModelWithDetails } = useCompensationModels();
  const { data: modelDetails, isLoading: loadingModel } = useModelWithDetails(modelId);

  // Form state
  const [profileId, setProfileId] = useState("");
  const [familyId, setFamilyId] = useState("");
  const [positionId, setPositionId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [salary, setSalary] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");
  const [changeType, setChangeType] = useState<ChangeType>("adjustment");
  const [changeReason, setChangeReason] = useState("");

  // Levels with salary ranges
  const [levels, setLevels] = useState<LevelWithRange[]>([]);
  const [loadingLevels, setLoadingLevels] = useState(false);

  const isEditing = !!employee;

  // Reset form when opening
  useEffect(() => {
    if (open) {
      if (employee) {
        setProfileId(employee.profile_id);
        setFamilyId(employee.level.position.family.id);
        setPositionId(employee.level.position.id);
        setLevelId(employee.level_id);
        setSalary(employee.current_salary?.toString() || "");
        setEffectiveDate(employee.effective_date || new Date().toISOString().split('T')[0]);
        setNotes(employee.notes || "");
      } else {
        setProfileId("");
        setFamilyId("");
        setPositionId("");
        setLevelId("");
        setSalary("");
        setEffectiveDate(new Date().toISOString().split('T')[0]);
        setNotes("");
      }
      setChangeType("adjustment");
      setChangeReason("");
    }
  }, [open, employee]);

  // Load levels when position changes
  useEffect(() => {
    if (!positionId) {
      setLevels([]);
      return;
    }

    const loadLevels = async () => {
      setLoadingLevels(true);
      try {
        const { data: levelsData } = await supabase
          .from("position_levels")
          .select("id, code, name, level_order, position_id")
          .eq("position_id", positionId)
          .order("level_order");

        if (levelsData && levelsData.length > 0) {
          const levelIds = levelsData.map(l => l.id);
          const { data: ranges } = await supabase
            .from("salary_ranges")
            .select("level_id, minimum, midpoint, maximum")
            .in("level_id", levelIds);

          const rangeMap = new Map(ranges?.map(r => [r.level_id, r]) || []);

          setLevels(levelsData.map(l => ({
            ...l,
            salary_range: rangeMap.get(l.id) || null,
          })));
        } else {
          setLevels([]);
        }
      } catch (error) {
        console.error("Error loading levels:", error);
      } finally {
        setLoadingLevels(false);
      }
    };

    loadLevels();
  }, [positionId]);

  // Derived data
  const families = useMemo(() => modelDetails?.families || [], [modelDetails]);
  
  const positions = useMemo(() => {
    const family = families.find(f => f.id === familyId);
    return family?.positions || [];
  }, [families, familyId]);

  const selectedLevel = useMemo(() => {
    return levels.find(l => l.id === levelId);
  }, [levels, levelId]);

  const salaryNum = parseFloat(salary.replace(/[^\d.-]/g, '')) || 0;

  const salaryWarning = useMemo(() => {
    if (!selectedLevel?.salary_range || !salaryNum) return null;
    
    const { minimum, maximum } = selectedLevel.salary_range;
    if (salaryNum < minimum) {
      return `Salário abaixo do mínimo da faixa (${formatCurrency(minimum)})`;
    }
    if (salaryNum > maximum) {
      return `Salário acima do máximo da faixa (${formatCurrency(maximum)})`;
    }
    return null;
  }, [selectedLevel, salaryNum]);

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await onSubmit({
      profile_id: profileId,
      level_id: levelId,
      current_salary: salaryNum || undefined,
      effective_date: effectiveDate,
      notes: notes || undefined,
      salary_range: selectedLevel?.salary_range ? {
        minimum: selectedLevel.salary_range.minimum,
        maximum: selectedLevel.salary_range.maximum,
      } : undefined,
      change_type: isEditing ? changeType : undefined,
      reason: isEditing ? changeReason : undefined,
    });
  };

  const isFormValid = profileId && levelId && salaryNum > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Posicionamento" : "Vincular Colaborador"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Atualize o posicionamento do colaborador"
              : "Vincule um colaborador a um cargo e nível"
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Collaborator */}
          <div className="space-y-2">
            <Label htmlFor="profile">Colaborador</Label>
            <Select
              value={profileId}
              onValueChange={setProfileId}
              disabled={isEditing || loadingProfiles}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o colaborador" />
              </SelectTrigger>
              <SelectContent>
                {profiles?.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.first_name} {profile.last_name} ({profile.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Family */}
          <div className="space-y-2">
            <Label htmlFor="family">Família de Cargos</Label>
            <Select
              value={familyId}
              onValueChange={(value) => {
                setFamilyId(value);
                setPositionId("");
                setLevelId("");
              }}
              disabled={loadingModel}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a família" />
              </SelectTrigger>
              <SelectContent>
                {families.map((family) => (
                  <SelectItem key={family.id} value={family.id}>
                    {family.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Position */}
          <div className="space-y-2">
            <Label htmlFor="position">Cargo</Label>
            <Select
              value={positionId}
              onValueChange={(value) => {
                setPositionId(value);
                setLevelId("");
              }}
              disabled={!familyId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cargo" />
              </SelectTrigger>
              <SelectContent>
                {positions.map((position) => (
                  <SelectItem key={position.id} value={position.id}>
                    {position.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Level */}
          <div className="space-y-2">
            <Label htmlFor="level">Nível</Label>
            <Select
              value={levelId}
              onValueChange={setLevelId}
              disabled={!positionId || loadingLevels}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o nível" />
              </SelectTrigger>
              <SelectContent>
                {levels.map((level) => (
                  <SelectItem key={level.id} value={level.id}>
                    {level.code} - {level.name}
                    {level.salary_range && (
                      <span className="text-muted-foreground ml-2">
                        ({formatCurrency(level.salary_range.minimum)} - {formatCurrency(level.salary_range.maximum)})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Salary Range Info */}
          {selectedLevel?.salary_range && (
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
              <div className="flex justify-between mb-1">
                <span>Mínimo:</span>
                <span className="font-mono">{formatCurrency(selectedLevel.salary_range.minimum)}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>Ponto médio:</span>
                <span className="font-mono">{formatCurrency(selectedLevel.salary_range.midpoint)}</span>
              </div>
              <div className="flex justify-between">
                <span>Máximo:</span>
                <span className="font-mono">{formatCurrency(selectedLevel.salary_range.maximum)}</span>
              </div>
            </div>
          )}

          {/* Current Salary */}
          <div className="space-y-2">
            <Label htmlFor="salary">Salário Atual (R$)</Label>
            <Input
              id="salary"
              type="number"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              placeholder="0,00"
              step="0.01"
              min="0"
            />
          </div>

          {/* Salary Warning */}
          {salaryWarning && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{salaryWarning}</AlertDescription>
            </Alert>
          )}

          {/* Change Type (only for editing) */}
          {isEditing && salary !== employee?.current_salary?.toString() && (
            <>
              <div className="space-y-2">
                <Label htmlFor="changeType">Tipo de Alteração</Label>
                <Select value={changeType} onValueChange={(v) => setChangeType(v as ChangeType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="merit">Mérito</SelectItem>
                    <SelectItem value="promotion">Promoção</SelectItem>
                    <SelectItem value="adjustment">Ajuste</SelectItem>
                    <SelectItem value="market">Mercado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Motivo da Alteração</Label>
                <Textarea
                  id="reason"
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="Descreva o motivo da alteração salarial..."
                  rows={2}
                />
              </div>
            </>
          )}

          {/* Effective Date */}
          <div className="space-y-2">
            <Label htmlFor="effectiveDate">Data de Vigência</Label>
            <Input
              id="effectiveDate"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações sobre o posicionamento..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isFormValid || isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Salvar" : "Vincular"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
