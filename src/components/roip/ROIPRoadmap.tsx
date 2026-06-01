import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Clock, 
  CheckCircle2,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface PilarPriorizado {
  ordem: number;
  pilar: string;
  score_atual: number;
  benchmark?: number;
  status: string;
  prazo_estimado?: string;
  prazo_planejamento?: string;
  prazo_execucao?: string;
  e_prioritario?: boolean;
  justificativa_priorizacao?: string | null;
}

interface RoadmapImplementacao {
  marco_atual: string;
  proximo_marco: string;
  timeline_estimado?: string;
  fase_atual?: string;
  proxima_fase?: string;
  pilares_priorizados?: PilarPriorizado[];
  proximos_3_passos?: Array<{
    ordem: number;
    ferramenta: {
      id: string;
      nome: string;
      rota: string;
      externo?: boolean;
    };
    pilar: string;
    objetivo: string;
    por_que_agora: string;
    prazo_sugerido: string;
    resultado_esperado: string;
    prerequisito?: string | null;
  }>;
  regra_priorizacao_aplicada?: string;
}

interface TempoImplementacao {
  fase_inicial?: string;
  fase_consolidacao?: string;
  fase_sustentacao?: string;
}

interface ROIPRoadmapProps {
  roadmap: RoadmapImplementacao;
  companyName?: string;
  tempoImplementacao?: TempoImplementacao | null;
}

// Premium minimalist palette - neutral tones
const PILLAR_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Cultura': { bg: 'bg-white', text: 'text-slate-800', border: 'border-slate-200' },
  'Atração': { bg: 'bg-white', text: 'text-slate-800', border: 'border-slate-200' },
  'Retenção': { bg: 'bg-white', text: 'text-slate-800', border: 'border-slate-200' },
  'Resultado': { bg: 'bg-white', text: 'text-slate-800', border: 'border-slate-200' },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'critico': { bg: 'bg-slate-800', text: 'text-white' },
  'atencao': { bg: 'bg-slate-600', text: 'text-white' },
  'saudavel': { bg: 'bg-slate-400', text: 'text-white' },
};

export const ROIPRoadmap = ({ roadmap, companyName, tempoImplementacao }: ROIPRoadmapProps) => {
  const getPillarColor = (pilar: string) => {
    return PILLAR_COLORS[pilar] || { bg: 'bg-white', text: 'text-slate-800', border: 'border-slate-200' };
  };

  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status] || { bg: 'bg-slate-200', text: 'text-slate-700' };
  };

  // Minimalist status indicator - just text instead of emojis
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'critico': '●',
      'atencao': '●',
      'saudavel': '●',
    };
    return labels[status] || '●';
  };

  return (
    <Card className="border border-slate-200 overflow-hidden">
      <CardHeader className="pb-3 bg-slate-50">
        <CardTitle className="flex items-center gap-2 text-base text-slate-800">
          <MapPin className="h-4 w-4 text-slate-600" />
          Roadmap de Implementação
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Compact Pillar Cards - Only priority + non-green pillars */}
        {roadmap.pilares_priorizados && roadmap.pilares_priorizados.length > 0 && (() => {
          // Filter: only show priority pillar + non-green pillars (score <= 70)
          const filteredPilares = roadmap.pilares_priorizados.filter(p => 
            p.e_prioritario || (p.status !== 'saudavel' && p.score_atual <= 70)
          );
          
          if (filteredPilares.length === 0) return null;
          
          return (
            <div className={`grid gap-2 ${filteredPilares.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : filteredPilares.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
              {filteredPilares.map((pilar, index) => {
              const colors = getPillarColor(pilar.pilar);
              const statusColors = getStatusColor(pilar.status);
              
              return (
                <motion.div
                  key={pilar.pilar}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`
                    p-3 rounded-lg border text-center bg-white
                    ${pilar.e_prioritario ? 'border-2 border-slate-800' : 'border-slate-200'} 
                  `}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-500">#{pilar.ordem}</span>
                    <span className={`text-xs ${pilar.status === 'critico' ? 'text-red-500' : pilar.status === 'atencao' ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {getStatusLabel(pilar.status)}
                    </span>
                  </div>
                  <p className="font-semibold text-sm text-slate-800">{pilar.pilar}</p>
                  <p className="text-2xl font-bold mt-1 text-slate-900">{pilar.score_atual}%</p>
                  {pilar.prazo_planejamento && (
                    <p className="text-xs text-slate-400 mt-1">{pilar.prazo_planejamento}</p>
                  )}
              </motion.div>
              );
            })}
            </div>
          );
        })()}

        {/* Compact Phases - Premium neutral styling */}
        {tempoImplementacao && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {tempoImplementacao.fase_inicial && (
              <div className="flex-1 min-w-[140px] p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-xs flex items-center justify-center font-bold">1</span>
                  <span className="text-xs font-semibold text-slate-600">0-30d</span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">{tempoImplementacao.fase_inicial}</p>
              </div>
            )}
            {tempoImplementacao.fase_consolidacao && (
              <div className="flex-1 min-w-[140px] p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-6 h-6 rounded-full bg-slate-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                  <span className="text-xs font-semibold text-slate-600">30-60d</span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">{tempoImplementacao.fase_consolidacao}</p>
              </div>
            )}
            {tempoImplementacao.fase_sustentacao && (
              <div className="flex-1 min-w-[140px] p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-6 h-6 rounded-full bg-slate-400 text-white text-xs flex items-center justify-center font-bold">3</span>
                  <span className="text-xs font-semibold text-slate-600">60-90d</span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">{tempoImplementacao.fase_sustentacao}</p>
              </div>
            )}
          </div>
        )}

        {/* Mini Progress Indicator - Premium neutral styling */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2">
            {['Diagnóstico', 'Cultura', 'Atração', 'Retenção', 'Resultado'].map((etapa, index) => {
              const isActive = index === 0;
              const isDone = index === 0;
              
              return (
                <div key={etapa} className="flex items-center flex-1">
                  <div className={`
                    flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                    ${isDone ? 'bg-slate-700 text-white' : ''}
                    ${isActive && !isDone ? 'bg-slate-800 text-white' : ''}
                    ${!isActive && !isDone ? 'bg-slate-200 text-slate-500' : ''}
                  `}>
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                  </div>
                  {index < 4 && (
                    <div className={`flex-1 h-0.5 mx-1 rounded ${isDone ? 'bg-slate-600' : 'bg-slate-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            {['Diag.', 'Cult.', 'Atr.', 'Ret.', 'Res.'].map((etapa, index) => (
              <span key={etapa} className={`text-[10px] ${index === 0 ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                {etapa}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
