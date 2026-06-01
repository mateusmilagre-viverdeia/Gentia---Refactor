import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Rocket } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { WizardStepBasicInfo } from "@/components/evolucao/wizard/WizardStepBasicInfo";
import { WizardStepCompetencyAssessment } from "@/components/evolucao/wizard/WizardStepCompetencyAssessment";
import { WizardStepDevelopmentPlan } from "@/components/evolucao/wizard/WizardStepDevelopmentPlan";
import { WizardStepReview } from "@/components/evolucao/wizard/WizardStepReview";
import type { EvolutionWizardData, CompetencyAssessment } from "@/types/evolution.types";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";

const steps = [
  { id: 1, title: "Informações Básicas", description: "Colaborador e cargo" },
  { id: 2, title: "Avaliação", description: "Gap analysis" },
  { id: 3, title: "PDI", description: "Plano de desenvolvimento" },
  { id: 4, title: "Revisão", description: "Confirmar e ativar" },
];

const initialData: EvolutionWizardData = {
  collaborator_id: "",
  leader_id: "",
  job_description_id: "",
  start_date: new Date().toISOString().split("T")[0],
  end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  notes: "",
  competencyAssessments: [],
};

const EvolutionWizard = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<EvolutionWizardData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch job description when selected
  const { data: jobDescription } = useQuery({
    queryKey: ["job-description-detail", data.job_description_id],
    queryFn: async () => {
      if (!data.job_description_id) return null;
      const { data: jd, error } = await supabase
        .from("job_descriptions")
        .select("*")
        .eq("id", data.job_description_id)
        .single();
      if (error) throw error;
      return jd;
    },
    enabled: !!data.job_description_id,
  });

  // When job description changes, load competencies
  useEffect(() => {
    if (jobDescription) {
      const competencies: CompetencyAssessment[] = [];
      
      // Add behavioral competencies
      if (jobDescription.behavioral_competencies?.length) {
        jobDescription.behavioral_competencies.forEach((comp: string) => {
          competencies.push({
            competency_name: comp,
            competency_type: 'behavioral',
            has_competency: false,
            success_indicators: [],
            actions: [],
          });
        });
      }
      
      // Add required technical skills
      if (jobDescription.required_skills?.length) {
        jobDescription.required_skills.forEach((comp: string) => {
          competencies.push({
            competency_name: comp,
            competency_type: 'technical_required',
            has_competency: false,
            success_indicators: [],
            actions: [],
          });
        });
      }
      
      // Add desired technical skills
      if (jobDescription.desired_skills?.length) {
        jobDescription.desired_skills.forEach((comp: string) => {
          competencies.push({
            competency_name: comp,
            competency_type: 'technical_desired',
            has_competency: false,
            success_indicators: [],
            actions: [],
          });
        });
      }
      
      setData(prev => ({ ...prev, competencyAssessments: competencies }));
    }
  }, [jobDescription]);

  const updateData = (updates: Partial<EvolutionWizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const gaps = data.competencyAssessments.filter(c => !c.has_competency);

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return data.collaborator_id && data.job_description_id && data.start_date && data.end_date;
      case 2:
        return data.competencyAssessments.length > 0;
      case 3:
        // Must have deadline for all gaps
        return gaps.every(gap => gap.development_deadline);
      default:
        return true;
    }
  };

  const handleSubmit = async (status: "draft" | "active") => {
    if (!currentOrganization?.id) {
      toast.error("Organização não encontrada");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create the cycle
      const { data: cycle, error: cycleError } = await supabase
        .from("evolution_cycles")
        .insert({
          account_id: currentOrganization.id,
          collaborator_id: data.collaborator_id,
          leader_id: data.leader_id || null,
          job_description_id: data.job_description_id || null,
          start_date: data.start_date,
          end_date: data.end_date,
          notes: data.notes || null,
          status,
        })
        .select()
        .single();

      if (cycleError) throw cycleError;

      // 2. Create competencies (all of them, with has_competency flag)
      for (const comp of data.competencyAssessments) {
        const { data: competency, error: compError } = await supabase
          .from("evolution_competencies")
          .insert({
            cycle_id: cycle.id,
            competency_name: comp.competency_name,
            competency_type: comp.competency_type,
            strategic_justification: `Competência do Job Description: ${jobDescription?.title || 'N/A'}`,
            expected_impact: comp.has_competency ? 'Competência já desenvolvida' : 'Gap a ser desenvolvido no ciclo',
            source: 'job_description',
            is_priority: !comp.has_competency,
            has_competency: comp.has_competency,
            development_deadline: comp.development_deadline || null,
            success_indicators: comp.success_indicators || [],
          })
          .select()
          .single();

        if (compError) throw compError;

        // 3. Create objectives for gaps (one per gap)
        if (!comp.has_competency) {
          const { data: objective, error: objError } = await supabase
            .from("evolution_objectives")
            .insert({
              cycle_id: cycle.id,
              competency_id: competency.id,
              objective_text: `Desenvolver: ${comp.competency_name}`,
              key_behaviors: [],
              progress_indicators: comp.success_indicators || [],
              order_index: 0,
              status: "pending",
            })
            .select()
            .single();

          if (objError) throw objError;

          // 4. Create actions for this gap
          if (comp.actions?.length && objective) {
            const actionsData = comp.actions.map((action, index) => ({
              objective_id: objective.id,
              action_type: action.action_type,
              description: action.description,
              responsible: action.responsible || null,
              due_date: action.due_date || null,
              order_index: index,
              status: "pending" as const,
            }));

            const { error: actError } = await supabase
              .from("evolution_actions")
              .insert(actionsData);

            if (actError) throw actError;
          }
        }
      }

      toast.success(
        status === "active" 
          ? "Ciclo de evolução criado e ativado!" 
          : "Ciclo salvo como rascunho"
      );
      
      navigate(`/retencao/evolucao/${cycle.id}`);
    } catch (error) {
      console.error("Error creating cycle:", error);
      toast.error("Erro ao criar ciclo de evolução");
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = (currentStep / steps.length) * 100;

  return (
    <AppLayout
      title="Novo Ciclo de Evolução"
      breadcrumb={[
        { label: "Retenção", href: "/retencao" },
        { label: "Sistema de Evolução", href: "/retencao/evolucao" },
        { label: "Novo Ciclo" },
      ]}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/retencao/evolucao")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Novo Ciclo de Evolução</h1>
            <p className="text-muted-foreground">
              Gap Analysis baseado no Job Description
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              Etapa {currentStep} de {steps.length}: {steps[currentStep - 1].title}
            </span>
            <span className="text-muted-foreground">
              {Math.round(progress)}% concluído
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center gap-2 ${
                index < steps.length - 1 ? "flex-1" : ""
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step.id < currentStep
                    ? "bg-primary text-primary-foreground"
                    : step.id === currentStep
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step.id < currentStep ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.id
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-colors ${
                    step.id < currentStep ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {currentStep === 1 && (
              <WizardStepBasicInfo data={data} updateData={updateData} />
            )}
            {currentStep === 2 && (
              <WizardStepCompetencyAssessment data={data} updateData={updateData} />
            )}
            {currentStep === 3 && (
              <WizardStepDevelopmentPlan data={data} updateData={updateData} />
            )}
            {currentStep === 4 && (
              <WizardStepReview data={data} />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>

          <div className="flex items-center gap-3">
            {currentStep === 4 ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleSubmit("draft")}
                  disabled={isSubmitting}
                >
                  Salvar como Rascunho
                </Button>
                <Button
                  onClick={() => handleSubmit("active")}
                  disabled={isSubmitting}
                  className="gap-2"
                >
                  <Rocket className="h-4 w-4" />
                  Ativar Ciclo
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setCurrentStep((s) => Math.min(4, s + 1))}
                disabled={!canProceed()}
              >
                Próximo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default EvolutionWizard;
