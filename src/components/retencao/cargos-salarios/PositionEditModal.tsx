import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, GripVertical, Save } from "lucide-react";
import { usePositions } from "@/hooks/usePositions";
import type { PositionWithLevels, PositionLevelWithRange } from "@/types/compensation.types";
import { toast } from "sonner";

interface PositionEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  positionId: string;
}

export const PositionEditModal = ({
  open,
  onOpenChange,
  positionId,
}: PositionEditModalProps) => {
  const { 
    usePositionWithDetails, 
    updatePosition, 
    updateLevel, 
    createLevel, 
    deleteLevel,
    upsertSalaryRange 
  } = usePositions();
  
  const { data: position, isLoading } = usePositionWithDetails(positionId);

  // Local state for editing
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [mission, setMission] = useState("");
  const [area, setArea] = useState("");
  const [subArea, setSubArea] = useState("");
  const [reportsTo, setReportsTo] = useState("");
  const [levels, setLevels] = useState<Partial<PositionLevelWithRange>[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Load data when position changes
  useEffect(() => {
    if (position) {
      setName(position.name || "");
      setCode(position.code || "");
      setMission(position.mission || "");
      setArea(position.area || "");
      setSubArea(position.sub_area || "");
      setReportsTo(position.reports_to || "");
      setLevels(position.levels || []);
    }
  }, [position]);

  const handleSaveBasicInfo = async () => {
    if (!name.trim()) {
      toast.error("Nome do cargo é obrigatório");
      return;
    }

    setIsSaving(true);
    try {
      await updatePosition.mutateAsync({
        id: positionId,
        name,
        code,
        mission,
        area,
        sub_area: subArea,
        reports_to: reportsTo,
      });
      toast.success("Informações básicas salvas");
    } catch (error) {
      toast.error("Erro ao salvar");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveLevel = async (level: Partial<PositionLevelWithRange>, index: number) => {
    if (!level.code?.trim() || !level.name?.trim()) {
      toast.error("Código e nome são obrigatórios");
      return;
    }

    setIsSaving(true);
    try {
      if (level.id) {
        // Update existing
        await updateLevel.mutateAsync({
          id: level.id,
          code: level.code,
          name: level.name,
          description: level.description,
          level_order: level.level_order,
        });

        // Update salary range if exists
        if (level.salary_range) {
          const salaryData = {
            level_id: level.id,
            minimum: level.salary_range.minimum || 0,
            midpoint: level.salary_range.midpoint || 0,
            maximum: level.salary_range.maximum || 0,
            currency: level.salary_range.currency || 'BRL',
            periodicity: level.salary_range.periodicity || 'monthly',
            ...(level.salary_range.id ? { id: level.salary_range.id } : {}),
          };
          await upsertSalaryRange.mutateAsync(salaryData);
        }
      } else {
        // Create new level
        await createLevel.mutateAsync({
          position_id: positionId,
          code: level.code,
          name: level.name,
          description: level.description,
          level_order: index + 1,
        });
      }
      toast.success("Nível salvo");
    } catch (error) {
      toast.error("Erro ao salvar nível");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLevel = async (level: Partial<PositionLevelWithRange>) => {
    if (!level.id) {
      // Just remove from local state
      setLevels(prev => prev.filter(l => l !== level));
      return;
    }

    if (!confirm("Tem certeza que deseja excluir este nível?")) return;

    setIsSaving(true);
    try {
      await deleteLevel.mutateAsync(level.id);
      setLevels(prev => prev.filter(l => l.id !== level.id));
    } catch (error) {
      toast.error("Erro ao excluir nível");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddLevel = () => {
    setLevels(prev => [...prev, {
      code: "",
      name: "",
      description: "",
      level_order: prev.length + 1,
    }]);
  };

  const updateLocalLevel = (index: number, field: string, value: any) => {
    setLevels(prev => prev.map((l, i) => 
      i === index ? { ...l, [field]: value } : l
    ));
  };

  const updateSalaryRange = (index: number, field: string, value: number) => {
    setLevels(prev => prev.map((l, i) => {
      if (i !== index) return l;
      return {
        ...l,
        salary_range: {
          ...l.salary_range,
          [field]: value,
        } as any,
      };
    }));
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse text-muted-foreground">Carregando...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Cargo: {position?.name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Informações Básicas</TabsTrigger>
            <TabsTrigger value="levels">Níveis e Salários</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Cargo *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Engenheiro de Software"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Código</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Ex: ENG-01"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mission">Missão do Cargo</Label>
              <Textarea
                id="mission"
                value={mission}
                onChange={(e) => setMission(e.target.value)}
                placeholder="Qual o propósito fundamental deste cargo?"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="area">Área</Label>
                <Input
                  id="area"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="Ex: Tecnologia"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subArea">Subárea</Label>
                <Input
                  id="subArea"
                  value={subArea}
                  onChange={(e) => setSubArea(e.target.value)}
                  placeholder="Ex: Backend"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reportsTo">Reporta para</Label>
              <Input
                id="reportsTo"
                value={reportsTo}
                onChange={(e) => setReportsTo(e.target.value)}
                placeholder="Ex: Tech Lead"
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSaveBasicInfo} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                Salvar Informações
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="levels" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Defina os níveis de senioridade e faixas salariais
              </p>
              <Button variant="outline" size="sm" onClick={handleAddLevel}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Nível
              </Button>
            </div>

            <div className="space-y-4">
              {levels.map((level, index) => (
                <Card key={level.id || `new-${index}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                        <Badge variant="outline">{index + 1}</Badge>
                      </div>
                      
                      <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Código *</Label>
                            <Input
                              value={level.code || ""}
                              onChange={(e) => updateLocalLevel(index, "code", e.target.value)}
                              placeholder="JR"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Nome *</Label>
                            <Input
                              value={level.name || ""}
                              onChange={(e) => updateLocalLevel(index, "name", e.target.value)}
                              placeholder="Júnior"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Descrição</Label>
                            <Input
                              value={level.description || ""}
                              onChange={(e) => updateLocalLevel(index, "description", e.target.value)}
                              placeholder="Perfil do nível"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Salário Mínimo (R$)</Label>
                            <Input
                              type="number"
                              value={level.salary_range?.minimum || ""}
                              onChange={(e) => updateSalaryRange(index, "minimum", Number(e.target.value))}
                              placeholder="0"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Salário Médio (R$)</Label>
                            <Input
                              type="number"
                              value={level.salary_range?.midpoint || ""}
                              onChange={(e) => updateSalaryRange(index, "midpoint", Number(e.target.value))}
                              placeholder="0"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Salário Máximo (R$)</Label>
                            <Input
                              type="number"
                              value={level.salary_range?.maximum || ""}
                              onChange={(e) => updateSalaryRange(index, "maximum", Number(e.target.value))}
                              placeholder="0"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteLevel(level)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSaveLevel(level, index)}
                            disabled={isSaving}
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Salvar Nível
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {levels.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhum nível definido.</p>
                  <Button variant="outline" onClick={handleAddLevel} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Primeiro Nível
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
