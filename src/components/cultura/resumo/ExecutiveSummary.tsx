import { useState, useEffect } from "react";
import { 
  Target, Eye, Diamond, BarChart3, Rocket, 
  Zap, TrendingUp, Scale, Download, Printer 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ExecutiveSummaryHeader } from "./ExecutiveSummaryHeader";
import { ExecutiveSummarySection } from "./ExecutiveSummarySection";
import { useMissionState } from "@/hooks/useMissionState";
import { useVisionState } from "@/hooks/useVisionState";
import { useIndicatorsSession } from "@/hooks/useIndicatorsSession";
import { useAccount } from "@/hooks/useAccount";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoGentia from "@/assets/logo-gentia.png";

interface ValueWithBehaviors {
  label: string;
  dos: string[];
  donts: string[];
}

interface DecisionAnswer {
  question_number: number;
  answer_text: string;
}

interface StrategicProject {
  id: string;
  project_name: string;
  perspective: string;
  responsible?: string;
  start_quarter?: string;
}

interface ExecutiveSummaryProps {
  onNavigateToPillar: (pillarId: string) => void;
}

const DECISION_QUESTIONS = [
  "O que não pode aqui? O que sua empresa considera como intolerável?",
  "Quais são as principais regras da empresa?",
  "O que devemos levar em consideração no momento de tomar decisões?",
  "Como sabemos quem contratar?",
  "Como sabemos quem demitir?",
  "Como sabemos quem promover ou não?",
  "Como tomamos decisões no nosso negócio?",
];

export function ExecutiveSummary({ onNavigateToPillar }: ExecutiveSummaryProps) {
  const { session: missionSession } = useMissionState();
  const { session: visionSession } = useVisionState();
  const { session: indicatorsSession } = useIndicatorsSession();
  const { account } = useAccount();

  // Local state for data that needs direct fetching
  const [values, setValues] = useState<ValueWithBehaviors[]>([]);
  const [energyRituals, setEnergyRituals] = useState<string[]>([]);
  const [developmentRituals, setDevelopmentRituals] = useState<string[]>([]);
  const [decisionAnswers, setDecisionAnswers] = useState<DecisionAnswer[]>([]);
  const [projects, setProjects] = useState<StrategicProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, [account?.id]);

  const loadAllData = async () => {
    if (!account?.id) return;
    
    try {
      // Load values with behaviors
      const { data: valuesSession } = await supabase
        .from('values_sessions')
        .select('id')
        .eq('account_id', account.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (valuesSession) {
        const { data: behaviors } = await supabase
          .from('values_behaviors_selections')
          .select('value_label, do_selected, dont_selected')
          .eq('session_id', valuesSession.id);
        
        if (behaviors) {
          setValues(behaviors.map(b => ({
            label: b.value_label,
            dos: b.do_selected || [],
            donts: b.dont_selected || [],
          })));
        }
      }

      // Load energy rituals
      const { data: energySession } = await supabase
        .from('energy_sessions')
        .select('id')
        .eq('account_id', account.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (energySession) {
        const { data: energySelections } = await supabase
          .from('energy_selections')
          .select('item_id')
          .eq('session_id', energySession.id)
          .eq('phase', 3);

        if (energySelections && energySelections.length > 0) {
          const itemIds = energySelections.map(s => s.item_id);
          const { data: items } = await supabase
            .from('energy_catalog')
            .select('label')
            .in('id', itemIds);
          
          setEnergyRituals(items?.map(i => i.label) || []);
        }
      }

      // Load development rituals
      const { data: devSession } = await supabase
        .from('development_sessions')
        .select('id')
        .eq('account_id', account.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (devSession) {
        const { data: devSelections } = await supabase
          .from('development_selections')
          .select('item_id')
          .eq('session_id', devSession.id)
          .eq('phase', 3);

        if (devSelections && devSelections.length > 0) {
          const itemIds = devSelections.map(s => s.item_id);
          const { data: items } = await supabase
            .from('development_catalog')
            .select('label')
            .in('id', itemIds);
          
          setDevelopmentRituals(items?.map(i => i.label) || []);
        }
      }

      // Load decision answers
      const { data: decisionSession } = await supabase
        .from('decision_sessions')
        .select('id')
        .eq('account_id', account.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (decisionSession) {
        const { data: answers } = await supabase
          .from('decision_answers')
          .select('question_number, answer_text')
          .eq('session_id', decisionSession.id)
          .order('question_number');
        
        setDecisionAnswers(answers || []);
      }

      // Load strategic projects
      const { data: projectsData } = await supabase
        .from('strategic_projects')
        .select('id, project_name, perspective, responsible, start_quarter')
        .eq('account_id', account.id)
        .order('perspective');
      
      setProjects(projectsData || []);

    } catch (error) {
      console.error('Error loading summary data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Determine completion status
  const missionComplete = missionSession.stage === 16 && missionSession.analysis?.missionStatement;
  const visionComplete = visionSession.stage === 13 && (visionSession.analysis?.visionInspirational || visionSession.finalVision);
  const valuesComplete = values.length >= 3;
  const indicatorsComplete = indicatorsSession?.stage === 3 && (indicatorsSession.final_selection as any[])?.length > 0;
  const projectsComplete = projects.length > 0;
  const energyComplete = energyRituals.length >= 3;
  const developmentComplete = developmentRituals.length >= 3;
  const decisionComplete = decisionAnswers.length > 0;

  const completedCount = [
    missionComplete, visionComplete, valuesComplete, indicatorsComplete,
    projectsComplete, energyComplete, developmentComplete, decisionComplete
  ].filter(Boolean).length;

  const completionPercentage = Math.round((completedCount / 8) * 100);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    window.print();
  };

  if (loading) {
    return <div className="text-center py-12">Carregando resumo...</div>;
  }

  // Group indicators by perspective using selected_step1
  const indicatorsByPerspective: Record<string, string[]> = {};
  if (indicatorsSession?.selected_step1) {
    const perspectiveLabels: Record<string, string> = {
      'financeira': 'Financeira',
      'clientes': 'Clientes',
      'processos': 'Processos Internos',
      'aprendizado': 'Aprendizado e Crescimento'
    };
    
    Object.entries(indicatorsSession.selected_step1).forEach(([key, indicators]) => {
      if (indicators && indicators.length > 0) {
        const label = perspectiveLabels[key] || key;
        indicatorsByPerspective[label] = indicators;
      }
    });
  }

  // Group projects by perspective
  const projectsByPerspective: Record<string, StrategicProject[]> = {};
  projects.forEach((proj) => {
    if (!projectsByPerspective[proj.perspective]) {
      projectsByPerspective[proj.perspective] = [];
    }
    projectsByPerspective[proj.perspective].push(proj);
  });

  // Group decision answers by question
  const answersByQuestion: Record<number, string[]> = {};
  decisionAnswers.forEach((ans) => {
    if (!answersByQuestion[ans.question_number]) {
      answersByQuestion[ans.question_number] = [];
    }
    answersByQuestion[ans.question_number].push(ans.answer_text);
  });

  return (
    <div className="max-w-4xl mx-auto print:max-w-none">
      {/* Progress Bar */}
      <Card className="p-4 mb-6 print:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progresso do Código de Cultura</span>
          <span className="text-sm text-muted-foreground">{completedCount}/8 pilares</span>
        </div>
        <Progress value={completionPercentage} className="h-2" />
        <p className="text-xs text-muted-foreground mt-2">
          {completionPercentage === 100 
            ? "🎉 Parabéns! Seu código de cultura está completo."
            : `Complete os pilares pendentes para finalizar seu código de cultura.`
          }
        </p>
      </Card>

      {/* Main Content */}
      <Card className="p-8 print:shadow-none print:border-none">
        <ExecutiveSummaryHeader companyName={account?.name || 'Sua Empresa'} />

        {/* Mission */}
        <ExecutiveSummarySection
          title="Missão"
          icon={<Target className="h-5 w-5" />}
          isComplete={!!missionComplete}
          onNavigate={() => onNavigateToPillar('missao')}
        >
          <blockquote className="border-l-4 border-primary pl-4 py-2 bg-muted/30 rounded-r">
            <p className="text-lg font-medium italic">
              "{missionSession.analysis?.missionStatement}"
            </p>
          </blockquote>
        </ExecutiveSummarySection>

        <Separator className="my-6" />

        {/* Vision */}
        <ExecutiveSummarySection
          title="Visão"
          icon={<Eye className="h-5 w-5" />}
          isComplete={!!visionComplete}
          onNavigate={() => onNavigateToPillar('visao')}
        >
          <blockquote className="border-l-4 border-primary pl-4 py-2 bg-muted/30 rounded-r">
            <p className="text-lg font-medium italic">
              "{visionSession.finalVision || visionSession.analysis?.visionInspirational}"
            </p>
          </blockquote>
        </ExecutiveSummarySection>

        <Separator className="my-6" />

        {/* Values */}
        <ExecutiveSummarySection
          title="Valores"
          icon={<Diamond className="h-5 w-5" />}
          isComplete={!!valuesComplete}
          onNavigate={() => onNavigateToPillar('valores')}
        >
          <div className="space-y-4">
            {values.map((value, idx) => (
              <div key={idx} className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">{value.label}</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-green-700 mb-2">Como vivemos:</p>
                    <ul className="text-sm space-y-1">
                      {value.dos.map((d, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-700 mb-2">Como não vivemos:</p>
                    <ul className="text-sm space-y-1">
                      {value.donts.map((d, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-red-600">✗</span>
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ExecutiveSummarySection>

        <Separator className="my-6" />

        {/* Strategic Indicators */}
        <ExecutiveSummarySection
          title="Indicadores Estratégicos"
          icon={<BarChart3 className="h-5 w-5" />}
          isComplete={!!indicatorsComplete}
          onNavigate={() => onNavigateToPillar('indicadores')}
        >
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(indicatorsByPerspective).map(([perspective, indicators]) => (
              <div key={perspective} className="border rounded-lg p-3">
                <h4 className="font-medium text-sm mb-2">{perspective}</h4>
                <ul className="text-sm space-y-1">
                  {indicators.map((ind, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {ind}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </ExecutiveSummarySection>

        <Separator className="my-6" />

        {/* Strategic Projects */}
        <ExecutiveSummarySection
          title="Projetos Estratégicos"
          icon={<Rocket className="h-5 w-5" />}
          isComplete={!!projectsComplete}
          onNavigate={() => onNavigateToPillar('projetos')}
        >
          <div className="space-y-4">
            {Object.entries(projectsByPerspective).map(([perspective, projs]) => (
              <div key={perspective}>
                <h4 className="font-medium text-sm mb-2 text-muted-foreground">{perspective}</h4>
                <div className="space-y-2">
                  {projs.map((proj) => (
                    <div key={proj.id} className="flex items-center justify-between border rounded p-3">
                      <span className="font-medium">{proj.project_name}</span>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {proj.responsible && <span>{proj.responsible}</span>}
                        {proj.start_quarter && <Badge variant="outline">{proj.start_quarter}</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ExecutiveSummarySection>

        <Separator className="my-6" />

        {/* Energy Rituals */}
        <ExecutiveSummarySection
          title="Rituais de Energia"
          icon={<Zap className="h-5 w-5" />}
          isComplete={!!energyComplete}
          onNavigate={() => onNavigateToPillar('energia')}
        >
          <div className="flex flex-wrap gap-2">
            {energyRituals.map((ritual, i) => (
              <Badge key={i} variant="secondary" className="text-sm py-1.5 px-3">
                {ritual}
              </Badge>
            ))}
          </div>
        </ExecutiveSummarySection>

        <Separator className="my-6" />

        {/* Development Rituals */}
        <ExecutiveSummarySection
          title="Rituais de Desenvolvimento"
          icon={<TrendingUp className="h-5 w-5" />}
          isComplete={!!developmentComplete}
          onNavigate={() => onNavigateToPillar('desenvolvimento')}
        >
          <div className="flex flex-wrap gap-2">
            {developmentRituals.map((ritual, i) => (
              <Badge key={i} variant="secondary" className="text-sm py-1.5 px-3">
                {ritual}
              </Badge>
            ))}
          </div>
        </ExecutiveSummarySection>

        <Separator className="my-6" />

        {/* Decision Framework */}
        <ExecutiveSummarySection
          title="Framework de Tomada de Decisão"
          icon={<Scale className="h-5 w-5" />}
          isComplete={!!decisionComplete}
          onNavigate={() => onNavigateToPillar('tomada-decisao')}
        >
          <div className="space-y-4">
            {DECISION_QUESTIONS.map((question, qIdx) => {
              const answers = answersByQuestion[qIdx + 1] || [];
              if (answers.length === 0) return null;
              
              return (
                <div key={qIdx} className="border rounded-lg p-3">
                  <h4 className="font-medium text-sm mb-2">{question}</h4>
                  <ul className="text-sm space-y-1">
                    {answers.map((ans, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {ans}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </ExecutiveSummarySection>

        {/* Actions */}
        <div className="mt-8 pt-6 border-t flex justify-center gap-4 print:hidden">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </Card>

      {/* Print watermark - hidden on screen, visible on print */}
      <div className="hidden print-watermark">
        <img src={logoGentia} alt="Gent.IA" />
        <div>Desenvolvido com Culture Coach</div>
      </div>
    </div>
  );
}
