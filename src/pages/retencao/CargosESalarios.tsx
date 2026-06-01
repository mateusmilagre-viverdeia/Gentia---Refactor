import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Briefcase, 
  Users, 
  BarChart3, 
  Calculator,
  Sparkles,
  AlertTriangle
} from "lucide-react";
import { useCompensationModels } from "@/hooks/useCompensationModels";
import { useJobFamilies } from "@/hooks/useJobFamilies";
import { usePositions } from "@/hooks/usePositions";
import { 
  CompensationModelSelector,
  CompensationModelForm,
  PositionList,
  TemplateSelector,
  ValorWizard,
  EmptyState,
  COMPENSATION_TEMPLATES,
  EmployeesTab,
  PositionEditModal,
  JobFamilyEditModal
} from "@/components/retencao/cargos-salarios";
import type { JobFamily } from "@/types/compensation.types";
import { JobFamilyForm } from "@/components/retencao/cargos-salarios/JobFamilyForm";
import type { CompensationTemplate, CreatePositionInput, CreatePositionLevelInput } from "@/types/compensation.types";
import { toast } from "sonner";

const CargosESalarios = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const { models, isLoading, createModel, useModelWithDetails } = useCompensationModels();
  const { createFamily, deleteFamily } = useJobFamilies();
  const { createPosition, deletePosition, createLevel } = usePositions();

  // Estados
  const [selectedModelId, setSelectedModelId] = useState<string>();
  const [activeTab, setActiveTab] = useState("positions");
  
  // Modais
  const [showModelForm, setShowModelForm] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [showValorWizard, setShowValorWizard] = useState(false);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>();
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [editingFamily, setEditingFamily] = useState<JobFamily | null>(null);

  // Query do modelo selecionado
  const { data: modelDetails, isLoading: isLoadingDetails } = useModelWithDetails(selectedModelId);

  // Selecionar primeiro modelo automaticamente
  useEffect(() => {
    if (models && models.length > 0 && !selectedModelId) {
      const activeModel = models.find(m => m.is_active) || models[0];
      setSelectedModelId(activeModel.id);
    }
  }, [models, selectedModelId]);

  // Handlers
  const handleCreateModel = () => {
    if (models && models.length === 0) {
      setShowTemplateSelector(true);
    } else {
      setShowModelForm(true);
    }
  };

  const handleTemplateSelect = async (template: CompensationTemplate) => {
    try {
      // Criar modelo
      const newModel = await createModel.mutateAsync({
        name: `Plano ${template.name}`,
        description: template.description,
        strategy_type: "growth",
      });

      // Criar famílias do template
      for (const family of template.families) {
        await createFamily.mutateAsync({
          model_id: newModel.id,
          name: family.name,
          career_track: family.career_track,
        });
      }

      setSelectedModelId(newModel.id);
      setShowTemplateSelector(false);
      toast.success("Modelo criado com sucesso a partir do template!");
    } catch (error) {
      console.error("Error creating from template:", error);
    }
  };

  const handleAddFamily = () => {
    if (!selectedModelId) return;
    setShowFamilyForm(true);
  };

  const handleAddPosition = (familyId: string) => {
    setSelectedFamilyId(familyId);
    setShowValorWizard(true);
  };

  const handlePositionCreate = async (position: CreatePositionInput, levels: CreatePositionLevelInput[]) => {
    try {
      // Criar cargo
      const newPosition = await createPosition.mutateAsync(position);

      // Criar níveis
      for (const level of levels) {
        await createLevel.mutateAsync({
          ...level,
          position_id: newPosition.id,
        });
      }

      setShowValorWizard(false);
      toast.success("Cargo criado com sucesso!");
    } catch (error) {
      console.error("Error creating position:", error);
    }
  };

  const handleEditPosition = (positionId: string) => {
    setEditingPositionId(positionId);
  };

  const handleEditFamily = (familyId: string) => {
    const family = modelDetails?.families?.find(f => f.id === familyId);
    if (family) {
      setEditingFamily(family as JobFamily);
    }
  };

  const handleDeletePosition = async (positionId: string) => {
    try {
      await deletePosition.mutateAsync(positionId);
    } catch (error) {
      console.error("Error deleting position:", error);
    }
  };

  const handleDeleteFamily = async (familyId: string) => {
    try {
      await deleteFamily.mutateAsync(familyId);
    } catch (error) {
      console.error("Error deleting family:", error);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  // Empty state - primeiro modelo
  if (!models || models.length === 0) {
    return (
      <div className="container max-w-6xl py-8">
        <Button variant="ghost" onClick={() => navigate("/retencao")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <Card>
          <CardHeader className="text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Sistema de Valorização</CardTitle>
            <CardDescription className="max-w-xl mx-auto">
              Não é uma tabela de cargos e salários tradicional. 
              É um sistema de valorização alinhado à estratégia, performance e retenção.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showTemplateSelector ? (
              <TemplateSelector onSelect={handleTemplateSelect} />
            ) : (
              <div className="text-center">
                <Button onClick={() => setShowTemplateSelector(true)} size="lg">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Começar com Template
                </Button>
                <p className="text-sm text-muted-foreground mt-4">
                  Ou <button className="underline" onClick={() => setShowModelForm(true)}>
                    comece do zero
                  </button>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <CompensationModelForm
          open={showModelForm}
          onOpenChange={setShowModelForm}
          onSubmit={async (data) => {
            const newModel = await createModel.mutateAsync(data);
            setSelectedModelId(newModel.id);
            setShowModelForm(false);
          }}
          isLoading={createModel.isPending}
        />
      </div>
    );
  }

  return (
    <div className="container max-w-7xl py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/retencao")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Briefcase className="h-6 w-6" />
              Cargos e Salários
            </h1>
            <p className="text-muted-foreground">
              Sistema de Valorização • Método V.A.L.O.R
            </p>
          </div>
        </div>

        <CompensationModelSelector
          models={models}
          selectedModelId={selectedModelId}
          onSelect={setSelectedModelId}
          onCreateNew={handleCreateModel}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="positions" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Famílias e Cargos
          </TabsTrigger>
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Colaboradores
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
            <Badge variant="secondary" className="ml-1">Em breve</Badge>
          </TabsTrigger>
          <TabsTrigger value="simulator" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Simulador
            <Badge variant="secondary" className="ml-1">Em breve</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="positions">
          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-pulse text-muted-foreground">Carregando estrutura...</div>
            </div>
          ) : modelDetails?.families ? (
            <PositionList
              families={modelDetails.families}
              onAddFamily={handleAddFamily}
              onEditFamily={handleEditFamily}
              onDeleteFamily={handleDeleteFamily}
              onAddPosition={handleAddPosition}
              onEditPosition={handleEditPosition}
              onDeletePosition={handleDeletePosition}
            />
          ) : (
            <EmptyState
              title="Nenhuma família criada"
              description="Crie famílias de cargos para organizar sua estrutura. Ex: Engenharia, Comercial, Operações."
              actionLabel="Criar Família"
              onAction={handleAddFamily}
            />
          )}
        </TabsContent>

        <TabsContent value="employees">
          {selectedModelId && (
            <EmployeesTab modelId={selectedModelId} />
          )}
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">Analytics de Compensação</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Dashboards de equidade interna, compressão salarial, 
                correlação com performance e muito mais.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulator">
          <Card>
            <CardContent className="py-12 text-center">
              <Calculator className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">Simulador de Impacto</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Simule cenários de ajustes, promoções e reajustes 
                antes de tomar decisões.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* AI Copilot Banner */}
      <Card className="mt-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium">IA Copiloto</h4>
              <p className="text-sm text-muted-foreground">
                A IA pode sugerir estruturas, detectar inconsistências e simular impactos. 
                Disponível em breve.
              </p>
            </div>
            <Badge variant="outline">Em desenvolvimento</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Modais */}
      <CompensationModelForm
        open={showModelForm}
        onOpenChange={setShowModelForm}
        onSubmit={async (data) => {
          const newModel = await createModel.mutateAsync(data);
          setSelectedModelId(newModel.id);
          setShowModelForm(false);
        }}
        isLoading={createModel.isPending}
      />

      {selectedModelId && (
        <JobFamilyForm
          open={showFamilyForm}
          onOpenChange={setShowFamilyForm}
          modelId={selectedModelId}
          onSubmit={async (data) => {
            await createFamily.mutateAsync(data);
            setShowFamilyForm(false);
          }}
          isLoading={createFamily.isPending}
        />
      )}

      {selectedFamilyId && (
        <ValorWizard
          open={showValorWizard}
          onOpenChange={setShowValorWizard}
          familyId={selectedFamilyId}
          onComplete={handlePositionCreate}
          isLoading={createPosition.isPending}
        />
      )}

      {editingPositionId && (
        <PositionEditModal
          open={!!editingPositionId}
          onOpenChange={(open) => !open && setEditingPositionId(null)}
          positionId={editingPositionId}
        />
      )}

      {editingFamily && (
        <JobFamilyEditModal
          open={!!editingFamily}
          onOpenChange={(open) => !open && setEditingFamily(null)}
          family={editingFamily}
        />
      )}
    </div>
  );
};

export default CargosESalarios;
