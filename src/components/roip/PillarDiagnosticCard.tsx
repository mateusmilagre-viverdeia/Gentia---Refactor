import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Target, Wrench } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface FerramentaGentia {
  id: string;
  nome: string;
  rota: string;
}

interface DiagnosticoPilar {
  pilar: string;
  status: string;
  score?: number;
  benchmark_segmento?: number;
  gap?: number;
  plano_acao?: string[];
  // Suporte para 1-3 ferramentas (novo) + compatibilidade com versão antiga
  ferramentas_gentia_recomendadas?: FerramentaGentia[];
  ferramenta_gentia_recomendada?: FerramentaGentia;
  // Campos antigos mantidos para compatibilidade temporária
  pontos_fortes?: string[];
  pontos_atencao?: string[];
  causa_raiz?: string;
  impacto_negocio?: string;
}

interface PillarDiagnosticCardProps {
  diagnostico: DiagnosticoPilar;
  index: number;
  isPriority?: boolean;
}

// Premium minimalist palette - neutral tones for executive look
const PILLAR_CONFIG: Record<string, { icon: string; bgGradient: string; borderColor: string; textColor: string; iconBg: string }> = {
  'Cultura': {
    icon: '🏛️',
    bgGradient: 'from-white to-slate-50/50',
    borderColor: 'border-slate-200',
    textColor: 'text-slate-800',
    iconBg: 'bg-slate-100'
  },
  'Cultura Organizacional': {
    icon: '🏛️',
    bgGradient: 'from-white to-slate-50/50',
    borderColor: 'border-slate-200',
    textColor: 'text-slate-800',
    iconBg: 'bg-slate-100'
  },
  'Atração': {
    icon: '🧲',
    bgGradient: 'from-white to-slate-50/50',
    borderColor: 'border-slate-200',
    textColor: 'text-slate-800',
    iconBg: 'bg-slate-100'
  },
  'Atração de Talentos': {
    icon: '🧲',
    bgGradient: 'from-white to-slate-50/50',
    borderColor: 'border-slate-200',
    textColor: 'text-slate-800',
    iconBg: 'bg-slate-100'
  },
  'Retenção': {
    icon: '🔒',
    bgGradient: 'from-white to-slate-50/50',
    borderColor: 'border-slate-200',
    textColor: 'text-slate-800',
    iconBg: 'bg-slate-100'
  },
  'Retenção de Talentos': {
    icon: '🔒',
    bgGradient: 'from-white to-slate-50/50',
    borderColor: 'border-slate-200',
    textColor: 'text-slate-800',
    iconBg: 'bg-slate-100'
  },
  'Resultado': {
    icon: '📈',
    bgGradient: 'from-white to-slate-50/50',
    borderColor: 'border-slate-200',
    textColor: 'text-slate-800',
    iconBg: 'bg-slate-100'
  },
  'Resultados': {
    icon: '📈',
    bgGradient: 'from-white to-slate-50/50',
    borderColor: 'border-slate-200',
    textColor: 'text-slate-800',
    iconBg: 'bg-slate-100'
  },
};

const DEFAULT_CONFIG = {
  icon: '📊',
  bgGradient: 'from-white to-slate-50/50',
  borderColor: 'border-slate-200',
  textColor: 'text-slate-800',
  iconBg: 'bg-slate-100'
};

const getMaturityLevel = (score: number): { level: number; label: string; description: string } => {
  if (score >= 90) return { level: 5, label: 'Excelência', description: 'É um ponto muito forte da empresa' };
  if (score >= 75) return { level: 4, label: 'Consolidado', description: 'Bem desenvolvido com oportunidades de refinamento' };
  if (score >= 60) return { level: 3, label: 'Desenvolvimento', description: 'Em evolução com potencial de melhoria' };
  if (score >= 40) return { level: 2, label: 'Atenção', description: 'Requer atenção e ações específicas' };
  return { level: 1, label: 'Crítico', description: 'Necessita intervenção imediata' };
};

// Premium minimalist status badges - subtle neutral tones
const getStatusBadge = (status: string): { bg: string; text: string } => {
  const upper = status?.toUpperCase() || '';
  if (upper.includes('CRÍTICO') || upper.includes('CRITICO')) return { bg: 'bg-slate-800', text: 'text-white' };
  if (upper.includes('ATENÇÃO') || upper.includes('ATENCAO')) return { bg: 'bg-slate-600', text: 'text-white' };
  if (upper.includes('ADEQUADO') || upper.includes('SAUDÁVEL') || upper.includes('SAUDAVEL')) return { bg: 'bg-slate-500', text: 'text-white' };
  if (upper.includes('EXCELENTE') || upper.includes('CONSOLIDADO')) return { bg: 'bg-slate-400', text: 'text-white' };
  return { bg: 'bg-slate-200', text: 'text-slate-700' };
};

export const PillarDiagnosticCard = ({ diagnostico, index, isPriority = false }: PillarDiagnosticCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  
  const config = PILLAR_CONFIG[diagnostico.pilar] || DEFAULT_CONFIG;
  const score = diagnostico.score || 0;
  const benchmark = diagnostico.benchmark_segmento || 72;
  const gap = diagnostico.gap ?? (score - benchmark);
  const maturity = getMaturityLevel(score);
  const statusBadge = getStatusBadge(diagnostico.status);
  
  const isAboveBenchmark = gap >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className={`
        border transition-all duration-300 overflow-hidden
        ${config.borderColor}
        ${isPriority ? 'border-2 border-slate-800 shadow-md' : ''}
        hover:shadow-sm
      `}>
        <CardContent className={`p-0 bg-gradient-to-br ${config.bgGradient}`}>
          {/* Main Card Content */}
          <div className="p-4 space-y-4">
            {/* Header with Icon, Title and Score */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.iconBg}`}>
                  <span className="text-2xl">{config.icon}</span>
                </div>
                <div>
                  <h4 className={`font-bold text-lg ${config.textColor}`}>{diagnostico.pilar}</h4>
                  {isPriority && (
                    <Badge className="bg-slate-800 text-white text-xs mt-1 border-0">
                      <Target className="h-3 w-3 mr-1" />
                      Pilar Prioritário
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className={`text-3xl font-bold ${config.textColor}`}>{score}%</span>
                <Badge className={`ml-2 ${statusBadge.bg} ${statusBadge.text} border-0`}>
                  {diagnostico.status}
                </Badge>
              </div>
            </div>

            {/* Progress Bars */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sua Empresa</span>
                <span className={`font-semibold ${config.textColor}`}>{score}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-500 ${
                    score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${score}%` }}
                />
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Média dos Nossos Clientes</span>
                <span className="font-medium text-slate-500">{benchmark}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full bg-slate-400"
                  style={{ width: `${benchmark}%` }}
                />
              </div>
            </div>

            {/* Gap Indicator - Subtle premium styling */}
            <div className={`flex items-center gap-2 p-2 rounded-lg border ${
              isAboveBenchmark ? 'bg-slate-50 border-slate-200' : 'bg-slate-50 border-slate-200'
            }`}>
              {isAboveBenchmark ? (
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              ) : gap === 0 ? (
                <Minus className="h-5 w-5 text-slate-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
              <span className={`font-semibold ${isAboveBenchmark ? 'text-emerald-700' : 'text-red-600'}`}>
                {isAboveBenchmark ? '+' : ''}{gap}% {isAboveBenchmark ? 'acima' : 'abaixo'} da média
              </span>
            </div>

            {/* Maturity Level - Premium neutral styling */}
            <div className="p-3 rounded-lg bg-white border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Nível de Maturidade:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div 
                      key={level}
                      className={`w-4 h-4 rounded-full ${
                        level <= maturity.level 
                          ? 'bg-slate-700'
                          : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className={`text-sm font-medium mt-1 text-slate-700`}>
                Nível {maturity.level}: {maturity.description}
              </p>
            </div>

            {/* Expandable Trigger */}
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  className={`w-full justify-center gap-2 ${config.textColor} hover:bg-white/50`}
                >
                  {isOpen ? (
                    <>
                      Fechar Diagnóstico
                      <ChevronUp className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Ver Diagnóstico Completo
                      <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-4 pt-4 border-t border-slate-200">
                {/* Plano de Ação - Premium neutral styling */}
                {diagnostico.plano_acao && diagnostico.plano_acao.length > 0 && (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <h5 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4 text-slate-600" />
                      Plano de Ação
                    </h5>
                    <ul className="space-y-2">
                      {diagnostico.plano_acao.slice(0, 3).map((acao, i) => (
                        <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                          <span className="font-bold text-slate-500 min-w-[18px]">{i + 1}.</span>
                          <span>{acao}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Ferramentas GENTIA Recomendadas (1-3) */}
                {(() => {
                  // Normalizar para array: suporta novo formato (array) e antigo (objeto único)
                  const ferramentas: FerramentaGentia[] = diagnostico.ferramentas_gentia_recomendadas 
                    || (diagnostico.ferramenta_gentia_recomendada ? [diagnostico.ferramenta_gentia_recomendada] : []);
                  
                  if (ferramentas.length === 0) return null;
                  
                  return (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <h5 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-slate-600" />
                        {ferramentas.length > 1 ? 'Ferramentas GENTIA Recomendadas' : 'Ferramenta GENTIA Recomendada'}
                      </h5>
                      <div className={`grid gap-2 ${ferramentas.length > 1 ? 'grid-cols-1' : ''}`}>
                        {ferramentas.map((ferramenta, idx) => (
                          <div key={ferramenta.id || idx} className="flex items-center justify-between bg-white rounded p-2 border border-slate-100">
                            <p className="text-sm font-medium text-slate-700">
                              {ferramentas.length > 1 && <span className="text-slate-400 mr-1">{idx + 1}.</span>}
                              {ferramenta.nome}
                            </p>
                            <Button 
                              size="sm" 
                              variant={idx === 0 ? "default" : "outline"}
                              className={idx === 0 ? "bg-slate-800 hover:bg-slate-700" : ""}
                              onClick={() => navigate(ferramenta.rota)}
                            >
                              Acessar
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

interface PillarDiagnosticGridProps {
  diagnosticos: DiagnosticoPilar[];
  pilarPrioritario?: string;
}

export const PillarDiagnosticGrid = ({ diagnosticos, pilarPrioritario }: PillarDiagnosticGridProps) => {
  // Sort to put priority pillar first
  const sortedDiagnosticos = [...diagnosticos].sort((a, b) => {
    if (pilarPrioritario) {
      const aIsPriority = a.pilar.toLowerCase().includes(pilarPrioritario.toLowerCase().split(' ')[0]);
      const bIsPriority = b.pilar.toLowerCase().includes(pilarPrioritario.toLowerCase().split(' ')[0]);
      if (aIsPriority && !bIsPriority) return -1;
      if (!aIsPriority && bIsPriority) return 1;
    }
    return 0;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sortedDiagnosticos.map((diagnostico, index) => {
        const isPriority = pilarPrioritario && 
          diagnostico.pilar.toLowerCase().includes(pilarPrioritario.toLowerCase().split(' ')[0]);
        
        return (
          <PillarDiagnosticCard 
            key={diagnostico.pilar} 
            diagnostico={diagnostico} 
            index={index}
            isPriority={isPriority}
          />
        );
      })}
    </div>
  );
};
