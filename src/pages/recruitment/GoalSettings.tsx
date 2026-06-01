import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRecruitmentGoals, useGoalProgress } from "@/hooks/useRecruitmentGoals";
import { GoalProgressCard, CreateGoalDialog, GoalHistoryList } from "@/components/recruitment/goals";
import { toast } from "sonner";

export default function GoalSettings() {
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const { 
    goals, 
    activeGoal, 
    isLoading, 
    isLoadingActive, 
    createGoal, 
    cancelGoal,
    isCreating 
  } = useRecruitmentGoals();
  
  const { data: goalProgress, isLoading: isLoadingProgress } = useGoalProgress(activeGoal);

  const handleCancelGoal = async (goalId: string) => {
    try {
      await cancelGoal(goalId);
      toast.success("Meta cancelada");
    } catch (error) {
      toast.error("Erro ao cancelar meta");
    }
  };

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/atracao-contratacao/recrutamento')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Target className="h-6 w-6" />
              Metas de Recrutamento
            </h1>
            <p className="text-muted-foreground">
              Defina e acompanhe metas por período
            </p>
          </div>
        </div>
        
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Meta
        </Button>
      </div>

      {/* Active Goal */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Meta Ativa</h2>
        
        {isLoadingActive || isLoadingProgress ? (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : goalProgress ? (
          <GoalProgressCard goalProgress={goalProgress} />
        ) : (
          <div className="border border-dashed rounded-lg p-8 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma meta ativa</h3>
            <p className="text-muted-foreground mb-4">
              Crie uma nova meta para acompanhar o progresso do recrutamento
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Meta
            </Button>
          </div>
        )}
      </div>

      {/* History */}
      <GoalHistoryList 
        goals={goals} 
        isLoading={isLoading}
        onCancel={handleCancelGoal}
      />

      {/* Create Dialog */}
      <CreateGoalDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={createGoal}
        isSubmitting={isCreating}
      />
    </div>
  );
}
