import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, TrendingUp, AlertTriangle, CheckCircle2, Lightbulb } from "lucide-react";
import { QAResult, QASession, QA_PROFILES, getDimensionStrength } from "@/types/qa.types";
import { QAProfileCard } from "./QAProfileCard";
import { QADimensionChart } from "./QADimensionChart";
import { QAAddToPDIDialog } from "./QAAddToPDIDialog";

interface QAResultViewProps {
  result: QAResult;
  session: QASession;
  onBack: () => void;
}

export function QAResultView({ result, session, onBack }: QAResultViewProps) {
  const [pdiDialogOpen, setPdiDialogOpen] = useState(false);
  const profileInfo = QA_PROFILES[result.profile];

  // Identify strengths and areas for improvement
  const dimensions = [
    { key: 'C', score: result.c_score, name: 'Controle' },
    { key: 'R', score: result.r_score, name: 'Responsabilidade' },
    { key: 'A', score: result.a_score, name: 'Alcance' },
    { key: 'D', score: result.d_score, name: 'Duração' },
  ];

  const sortedDimensions = [...dimensions].sort((a, b) => b.score - a.score);
  const strengths = sortedDimensions.slice(0, 2).filter(d => getDimensionStrength(d.score) !== 'baixo');
  const improvements = sortedDimensions.slice(-2).filter(d => getDimensionStrength(d.score) === 'baixo' || getDimensionStrength(d.score) === 'moderado');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
          <Button size="sm" onClick={() => setPdiDialogOpen(true)}>
            <TrendingUp className="mr-2 h-4 w-4" />
            Adicionar ao PDI
          </Button>
        </div>
      </div>

      {/* Participant Info */}
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Resultado do Teste QA</h1>
        <p className="text-muted-foreground">
          Participante: <span className="font-medium text-foreground">{session.participant_name}</span>
        </p>
        {session.completed_at && (
          <p className="text-sm text-muted-foreground">
            Concluído em {new Date(session.completed_at).toLocaleDateString('pt-BR')}
          </p>
        )}
      </div>

      {/* Main Results Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <QAProfileCard result={result} />
        
        {/* Dimensions Chart */}
        <QADimensionChart result={result} />
      </div>

      {/* Interpretation Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Strengths */}
        <Card className="border-green-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Pontos Fortes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {strengths.length > 0 ? (
                strengths.map(d => (
                  <li key={d.key} className="flex items-start gap-2 text-sm">
                    <span className="text-green-500 mt-0.5">•</span>
                    <span>
                      <strong>{d.name}:</strong> Você demonstra boa capacidade de{' '}
                      {d.key === 'C' && 'perceber influência sobre as situações'}
                      {d.key === 'R' && 'assumir responsabilidade por melhorias'}
                      {d.key === 'A' && 'limitar o impacto das adversidades'}
                      {d.key === 'D' && 'perceber que dificuldades são temporárias'}
                    </span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted-foreground">
                  Todas as dimensões podem ser desenvolvidas
                </li>
              )}
            </ul>
          </CardContent>
        </Card>

        {/* Areas for Improvement */}
        <Card className="border-amber-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Pontos de Atenção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {improvements.length > 0 ? (
                improvements.map(d => (
                  <li key={d.key} className="flex items-start gap-2 text-sm">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>
                      <strong>{d.name}:</strong>{' '}
                      {d.key === 'C' && 'Desenvolver senso de influência sobre situações adversas'}
                      {d.key === 'R' && 'Fortalecer senso de responsabilidade por mudanças'}
                      {d.key === 'A' && 'Trabalhar para limitar o impacto das adversidades'}
                      {d.key === 'D' && 'Reconhecer que dificuldades são temporárias'}
                    </span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted-foreground">
                  Você demonstra bom equilíbrio nas dimensões avaliadas
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Development Suggestions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5 text-primary" />
            Sugestões de Desenvolvimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {result.profile === 'alpinista' && (
              <>
                <p className="text-sm text-muted-foreground">
                  Você demonstra alta resiliência e capacidade de lidar com adversidades. 
                  Continue desenvolvendo suas habilidades de liderança e apoie colegas que 
                  possam estar enfrentando dificuldades.
                </p>
                <ul className="text-sm space-y-1">
                  <li>• Mentoria: considere apoiar colegas no desenvolvimento de resiliência</li>
                  <li>• Desafios: busque projetos que exijam suas habilidades de superação</li>
                  <li>• Equilíbrio: mantenha práticas de autocuidado para sustentar sua energia</li>
                </ul>
              </>
            )}
            {result.profile === 'campista' && (
              <>
                <p className="text-sm text-muted-foreground">
                  Você tem resiliência moderada e consegue lidar com a maioria das adversidades. 
                  Há oportunidade de expandir sua zona de conforto gradualmente.
                </p>
                <ul className="text-sm space-y-1">
                  <li>• Exposição gradual: aceite desafios um pouco além da sua zona de conforto</li>
                  <li>• Reframe: pratique reinterpretar situações adversas como oportunidades</li>
                  <li>• Suporte: busque mentores ou colegas que demonstrem alta resiliência</li>
                </ul>
              </>
            )}
            {result.profile === 'desistente' && (
              <>
                <p className="text-sm text-muted-foreground">
                  Este resultado indica oportunidades significativas de desenvolvimento. 
                  Com as estratégias certas, você pode aumentar sua resiliência e bem-estar.
                </p>
                <ul className="text-sm space-y-1">
                  <li>• Pequenas vitórias: celebre cada pequena conquista para construir confiança</li>
                  <li>• Perspectiva: pratique identificar aspectos que você pode controlar</li>
                  <li>• Apoio: não hesite em buscar suporte de liderança ou RH</li>
                  <li>• Autocuidado: priorize práticas que renovem sua energia</li>
                </ul>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <Card className="border-muted bg-muted/30">
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground text-center">
            <strong>Nota:</strong> Este teste é uma ferramenta de autoconhecimento e desenvolvimento profissional.
            Não substitui avaliação psicológica ou clínica. Os resultados devem ser interpretados no contexto
            do desenvolvimento de carreira e bem-estar no trabalho.
          </p>
        </CardContent>
      </Card>

      {/* PDI Dialog */}
      <QAAddToPDIDialog
        open={pdiDialogOpen}
        onOpenChange={setPdiDialogOpen}
        result={result}
        session={session}
      />
    </div>
  );
}
