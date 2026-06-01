import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Target, Lightbulb, Clock, Zap, TrendingUp, DollarSign, ArrowRight, CheckCircle2, BarChart3, AlertTriangle } from 'lucide-react';
import { PillarDiagnosticGrid } from './PillarDiagnosticCard';
import { ROIPTimeline } from './ROIPTimeline';
import { ROIPRoadmap } from './ROIPRoadmap';
import { ProximosPassosGentia } from './ProximosPassosGentia';

// Support both snake_case (from API) and camelCase (legacy) formats
interface AIAnalysisCardProps {
  analysisData: {
    // Snake case (from edge function)
    classificacao_geral?: string;
    carta_ao_ceo?: string;
    resumo_executivo?: string;
    pilar_prioritario?: string;
    roadmap_implementacao?: {
      marco_atual: string;
      proximo_marco: string;
      timeline_estimado?: string;
      pilares_priorizados?: Array<{
        ordem: number;
        pilar: string;
        score_atual: number;
        benchmark?: number;
        status: string;
        prazo_estimado?: string;
        prazo_planejamento?: string;
        e_prioritario?: boolean;
      }>;
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
    };
    analise_correlacoes?: Array<{
      relacao: string;
      impacto: string;
      evidencia: string;
      custo_estimado?: string;
    }>;
    impacto_financeiro?: {
      custo_turnover_atual?: {
        valor: string;
        calculo: string;
        economia_potencial: string;
      };
      custo_vacancia?: {
        valor: string;
        calculo: string;
        reducao_potencial: string;
      };
      perda_desengajamento?: {
        valor: string;
        calculo: string;
        recuperacao_potencial: string;
      };
      perda_produtividade?: {
        valor: string;
        calculo: string;
        recuperacao_potencial: string;
      };
      roi_projetos_sugeridos?: Array<{
        projeto: string;
        investimento_estimado: string;
        retorno_estimado: string;
        roi: string;
        payback: string;
        pilar_impactado: string;
      }>;
      resumo_impacto?: string;
      fonte_dados?: string;
    };
    diagnostico_pilares?: Array<{
      pilar: string;
      status: string;
      score?: number;
      benchmark_segmento?: number;
      gap?: number;
      pontos_fortes?: string[];
      pontos_atencao?: string[];
      causa_raiz?: string;
      impacto_negocio?: string;
      ferramentas_gentia_recomendadas?: Array<{
        id: string;
        nome: string;
        rota: string;
      }>;
      ferramenta_gentia_recomendada?: {
        id: string;
        nome: string;
        rota: string;
      };
    }>;
    tres_passos_melhoria?: Array<{
      passo?: number;
      titulo?: string;
      descricao?: string;
      prazo_sugerido?: string;
      pilar_impactado?: string;
      investimento_estimado?: string;
      retorno_esperado?: string;
      roi_estimado?: string;
    }>;
    tempo_implementacao?: {
      fase_inicial?: string;
      fase_consolidacao?: string;
      fase_sustentacao?: string;
    } | string;
    metricas_acompanhamento?: Array<{
      metrica: string;
      valor_atual_estimado: string;
      meta_sugerida: string;
      prazo: string;
      impacto_financeiro: string;
    }>;
    alertas_criticos?: string[];
    quick_wins?: Array<{
      acao: string;
      ferramenta_gentia?: string;
      esforco: string;
      impacto: string;
      prazo: string;
      resultado_esperado: string;
    } | string>;
    decisao_estrategica?: {
      questao_central: string;
      opcoes: Array<{
        opcao: string;
        pros: string[];
        contras: string[];
        investimento: string;
        timeline: string;
      }>;
      recomendacao: string;
    };
    // Legacy camelCase support
    classificacaoGeral?: string;
    pilarPrioritario?: string;
    tresPassosMelhoria?: string[];
    tempoImplementacao?: string;
  };
  companyName?: string;
}

// Format currency to abbreviated form
const formatCurrency = (value: string): string => {
  const num = parseFloat(value.replace(/[^0-9,-]/g, '').replace(',', '.'));
  if (isNaN(num)) return value;
  if (num >= 1000000) return `R$ ${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `R$ ${Math.round(num / 1000)}K`;
  return value;
};

// Extract score from pilar prioritario text
const extractScore = (text?: string): number | null => {
  if (!text) return null;
  const match = text.match(/(\d+)%/);
  return match ? parseInt(match[1]) : null;
};

// Extract pillar name from text
const extractPillarName = (text?: string): string => {
  if (!text) return '';
  // Try to get just the pillar name (first word)
  const pillars = ['Cultura', 'Atração', 'Retenção', 'Resultado'];
  for (const p of pillars) {
    if (text.toLowerCase().includes(p.toLowerCase())) return p;
  }
  return text.split(' ')[0] || text;
};

export const AIAnalysisCard = ({ analysisData, companyName }: AIAnalysisCardProps) => {
  // Normalize data - support both snake_case and camelCase
  const classificacao = analysisData.classificacao_geral || analysisData.classificacaoGeral || 'Não disponível';
  const pilarPrioritario = analysisData.pilar_prioritario || analysisData.pilarPrioritario;
  const roadmapImplementacao = analysisData.roadmap_implementacao;
  const analiseCorrelacoes = analysisData.analise_correlacoes;
  const impactoFinanceiro = analysisData.impacto_financeiro;
  const diagnosticoPilares = analysisData.diagnostico_pilares;
  const metricasAcompanhamento = analysisData.metricas_acompanhamento;
  const decisaoEstrategica = analysisData.decisao_estrategica;
  
  // Handle quick_wins - can be array of objects or array of strings
  const quickWins = analysisData.quick_wins?.map(win => 
    typeof win === 'string' ? { acao: win, esforco: '', impacto: '', prazo: '', resultado_esperado: '' } : win
  ) || [];
  
  // Handle tres_passos_melhoria - can be array of objects or array of strings
  const passosMelhoria = analysisData.tres_passos_melhoria || 
    (analysisData.tresPassosMelhoria?.map((step, i) => ({ passo: i + 1, titulo: step, descricao: '' })) || []);
  
  // Handle tempo_implementacao - can be object or string
  const tempoImplementacao = typeof analysisData.tempo_implementacao === 'object'
    ? analysisData.tempo_implementacao
    : (analysisData.tempo_implementacao || analysisData.tempoImplementacao
        ? { fase_inicial: String(analysisData.tempo_implementacao || analysisData.tempoImplementacao) }
        : null);

  // Extract priority score
  const priorityScore = extractScore(pilarPrioritario);
  const priorityPillarName = extractPillarName(pilarPrioritario);

  // Calculate overall score from classification
  const getOverallScore = (classification: string): number => {
    const upper = classification?.toUpperCase() || '';
    if (upper.includes('EXCELÊNCIA') || upper.includes('EXCELENCIA')) return 85;
    if (upper.includes('CONSOLIDADO')) return 76;
    if (upper.includes('DESENVOLVIMENTO')) return 60;
    if (upper.includes('CRÍTICO') || upper.includes('CRITICO')) return 40;
    return 65;
  };
  const overallScore = getOverallScore(classificacao);

  // Premium minimalist classification colors - neutral tones
  const getClassificationColor = (classification: string) => {
    const upper = classification?.toUpperCase() || '';
    if (upper.includes('CRÍTICO') || upper.includes('CRITICO')) return { bg: 'bg-slate-800', text: 'text-white', border: 'border-slate-800' };
    if (upper.includes('DESENVOLVIMENTO') || upper.includes('ATENÇÃO') || upper.includes('ATENCAO')) return { bg: 'bg-slate-600', text: 'text-white', border: 'border-slate-600' };
    if (upper.includes('CONSOLIDADO')) return { bg: 'bg-slate-700', text: 'text-white', border: 'border-slate-700' };
    if (upper.includes('EXCELÊNCIA') || upper.includes('EXCELENCIA')) return { bg: 'bg-slate-600', text: 'text-white', border: 'border-slate-600' };
    return { bg: 'bg-slate-500', text: 'text-white', border: 'border-slate-500' };
  };

  const getEffortIcon = (esforco: string) => {
    const upper = esforco?.toUpperCase() || '';
    if (upper.includes('BAIXO') || upper.includes('LOW')) return '⚡';
    if (upper.includes('MÉDIO') || upper.includes('MEDIO')) return '⚙️';
    return '🔧';
  };

  const classColors = getClassificationColor(classificacao);

  // Prepare timeline data
  const timelinePilares = roadmapImplementacao?.pilares_priorizados?.map(p => ({
    ordem: p.ordem,
    pilar: p.pilar,
    score_atual: p.score_atual,
    status: p.status,
    e_prioritario: p.e_prioritario,
    prazo_planejamento: p.prazo_planejamento || p.prazo_estimado
  })) || diagnosticoPilares?.map((d, i) => ({
    ordem: i + 1,
    pilar: d.pilar,
    score_atual: d.score || 0,
    status: d.status.toLowerCase().includes('crítico') ? 'critico' : d.status.toLowerCase().includes('atenção') ? 'atencao' : 'saudavel',
    e_prioritario: pilarPrioritario?.toLowerCase().includes(d.pilar.toLowerCase())
  })) || [];

  return (
    <div className="space-y-6">
      {/* 1. VISUAL HEADER - Classification Only (full width) */}
      <Card className="border border-slate-200 overflow-hidden">
        <CardContent className="p-0">
          <div className="p-6 bg-slate-50">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
              <Sparkles className="h-4 w-4" />
              Classificação Geral
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`${classColors.bg} ${classColors.text} text-lg px-4 py-2 font-bold border-0`}>
                {classificacao.split(' ')[0].toUpperCase()}
              </Badge>
              <span className="text-4xl font-bold text-slate-800">{overallScore}%</span>
            </div>
            <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden max-w-md">
              <div 
                className="h-full bg-slate-700 transition-all duration-500"
                style={{ width: `${overallScore}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {overallScore >= 85 ? 'Excelência em gestão de pessoas' : 
               overallScore >= 71 ? 'Maturidade consolidada com oportunidades de evolução' :
               overallScore >= 51 ? 'Em desenvolvimento, requer atenção estruturada' :
               'Situação crítica, ação imediata necessária'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 2. PILAR PRIORITÁRIO */}
      {pilarPrioritario && (
        <Card className="border border-slate-200 bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-500">Pilar Prioritário</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-bold text-slate-800">{priorityPillarName}</span>
              {priorityScore !== null && (
                <span className="text-2xl font-bold text-slate-800">{priorityScore}%</span>
              )}
            </div>
            {priorityScore !== null && (
              <Progress value={priorityScore} className="h-2" />
            )}
            <p className="text-xs text-slate-500 mt-2">{pilarPrioritario}</p>
          </CardContent>
        </Card>
      )}

      {/* 2b. TRILHA DA CONSULTORIA */}
      {timelinePilares.length > 0 && (
        <Card className="border border-slate-200 bg-white">
          <CardContent className="p-4">
            <ROIPTimeline 
              pilares={timelinePilares} 
              marcoAtual={roadmapImplementacao?.marco_atual} 
            />
          </CardContent>
        </Card>
      )}

      {/* 2c. ROADMAP DE IMPLEMENTAÇÃO */}
      {roadmapImplementacao && (
        <ROIPRoadmap 
          roadmap={roadmapImplementacao} 
          companyName={companyName}
          tempoImplementacao={tempoImplementacao}
        />
      )}

      {/* 3. FINANCIAL IMPACT - 3 Compact Cards - Premium minimalist design */}
      {impactoFinanceiro && (
        <div className="grid grid-cols-3 gap-3">
          {impactoFinanceiro.custo_turnover_atual && (
            <Card className="border border-slate-200 bg-white">
              <CardContent className="p-3 text-center">
                <DollarSign className="h-5 w-5 mx-auto text-slate-400 mb-1" />
                <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Turnover</div>
                <div className="text-lg font-bold text-slate-800">
                  {formatCurrency(impactoFinanceiro.custo_turnover_atual.valor)}
                </div>
                {impactoFinanceiro.custo_turnover_atual.economia_potencial && (
                  <div className="text-[10px] text-emerald-600 mt-1">
                    Economia: {formatCurrency(impactoFinanceiro.custo_turnover_atual.economia_potencial)}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {impactoFinanceiro.perda_desengajamento && (
            <Card className="border border-slate-200 bg-white">
              <CardContent className="p-3 text-center">
                <TrendingUp className="h-5 w-5 mx-auto text-slate-400 mb-1" />
                <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Desengajamento</div>
                <div className="text-lg font-bold text-slate-800">
                  {formatCurrency(impactoFinanceiro.perda_desengajamento.valor)}
                </div>
                {impactoFinanceiro.perda_desengajamento.recuperacao_potencial && (
                  <div className="text-[10px] text-emerald-600 mt-1">
                    Recuperar: {formatCurrency(impactoFinanceiro.perda_desengajamento.recuperacao_potencial)}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {impactoFinanceiro.perda_produtividade && (
            <Card className="border border-slate-200 bg-white">
              <CardContent className="p-3 text-center">
                <BarChart3 className="h-5 w-5 mx-auto text-slate-400 mb-1" />
                <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Improdutividade</div>
                <div className="text-lg font-bold text-slate-800">
                  {formatCurrency(impactoFinanceiro.perda_produtividade.valor)}
                </div>
                {impactoFinanceiro.perda_produtividade.recuperacao_potencial && (
                  <div className="text-[10px] text-emerald-600 mt-1">
                    Recuperar: {formatCurrency(impactoFinanceiro.perda_produtividade.recuperacao_potencial)}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 4. CORRELATIONS - Premium minimalist design */}
      {analiseCorrelacoes && analiseCorrelacoes.length > 0 && (
        <Card className="border border-slate-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-800">
              <ArrowRight className="h-4 w-4 text-slate-500" />
              Correlações de Impacto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analiseCorrelacoes.slice(0, 3).map((corr, index) => (
              <div key={index} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-slate-700">{corr.relacao.split('→')[0]}</span>
                  <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-500 flex-1">{corr.relacao.split('→').slice(1).join('→') || ''}</span>
                  {corr.custo_estimado && (
                    <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                      {formatCurrency(corr.custo_estimado)}
                    </Badge>
                  )}
                </div>
                {corr.impacto && (
                  <p className="text-xs text-slate-500 mt-1.5 pl-0">
                    {corr.impacto}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 5. PILLAR DIAGNOSTICS - Cards */}
      {diagnosticoPilares && diagnosticoPilares.length > 0 && (
        <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-800">
          <Target className="h-5 w-5 text-slate-600" />
          Onboarding - Diagnóstico por Pilar
        </h3>
          <PillarDiagnosticGrid 
            diagnosticos={diagnosticoPilares} 
            pilarPrioritario={pilarPrioritario}
          />
        </div>
      )}

      {/* PRÓXIMOS 3 PASSOS */}
      {roadmapImplementacao?.proximos_3_passos && roadmapImplementacao.proximos_3_passos.length > 0 && (
        <ProximosPassosGentia passos={roadmapImplementacao.proximos_3_passos} />
      )}

      {/* CTA - Plano de Implementação */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold">Plano de Implementação Personalizado</p>
              <p className="text-xs text-muted-foreground">Gere um plano completo com prazos e prioridades baseado neste diagnóstico</p>
            </div>
          </div>
          <a href="/diagnostico/plano-implementacao" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline whitespace-nowrap">
            Ver Plano <ArrowRight className="h-4 w-4" />
          </a>
        </CardContent>
      </Card>


      {/* 7. QUICK WINS - Premium minimalist design */}
      {quickWins && quickWins.length > 0 && (
        <Card className="border border-slate-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-800">
              <Zap className="h-4 w-4 text-slate-500" />
              Quick Wins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-slate-100">
              {quickWins.slice(0, 4).map((win, index) => (
                <div key={index} className="py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-slate-500 font-bold text-sm">{index + 1}.</span>
                      <span className="text-sm text-slate-700 truncate">{win.acao}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="text-xs gap-1 bg-slate-50 border-slate-200 text-slate-600">
                        <span>{getEffortIcon(win.esforco)}</span>
                        {win.esforco}
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-slate-50 border-slate-200 text-slate-600">
                        <Clock className="h-3 w-3 mr-1" />
                        {win.prazo}
                      </Badge>
                    </div>
                  </div>
                  {win.resultado_esperado && (
                    <p className="text-xs text-slate-500 mt-1 pl-5 line-clamp-1">
                      → {win.resultado_esperado}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}


      {/* Expandable Sections - For additional details */}
      <Accordion type="multiple" className="w-full space-y-2">
        {/* Improvement Steps with ROI */}
        {passosMelhoria && passosMelhoria.length > 0 && (
          <AccordionItem value="steps" className="border rounded-lg px-4">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                Plano de Ação Detalhado
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
                {passosMelhoria.map((step, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-bold">
                      {step.passo || index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-semibold">{step.titulo}</h5>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {step.prazo_sugerido && (
                          <Badge variant="outline" className="text-xs">⏱️ {step.prazo_sugerido}</Badge>
                        )}
                        {step.roi_estimado && (
                          <Badge className="bg-green-100 text-green-700 text-xs">📈 ROI: {step.roi_estimado}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Strategic Decision */}
        {decisaoEstrategica && (
          <AccordionItem value="decision" className="border rounded-lg px-4">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <Target className="h-4 w-4 text-indigo-500" />
                Decisão Estratégica
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2 space-y-3">
                <p className="font-medium text-indigo-700 dark:text-indigo-300">{decisaoEstrategica.questao_central}</p>
                {decisaoEstrategica.recomendacao && (
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300 font-medium">
                      <CheckCircle2 className="h-4 w-4" />
                      Recomendação
                    </div>
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">{decisaoEstrategica.recomendacao}</p>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
};
