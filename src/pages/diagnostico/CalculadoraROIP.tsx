import React, { useState, useEffect } from 'react';
import { Calculator, TrendingUp, Users, BarChart3, ArrowLeft, Plus } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ROIPForm } from '@/components/forms/ROIPForm';
import { ROIPDashboard } from '@/components/dashboard/ROIPDashboard';
import { DadosFormulario, ResultadosROIP, calcularROIP, recalcularCenariosEconomia } from '@/utils/calculations';
import { SimulationSearchButton } from '@/components/search/SimulationSearchButton';
import { SimulationSearchModal } from '@/components/search/SimulationSearchModal';
import { SimulationSelector } from '@/components/search/SimulationSelector';
import { LoadingCalculation } from '@/components/ui/LoadingCalculation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useAccount } from '@/hooks/useAccount';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CalculadoraROIP = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { account } = useAccount();

  const [resultados, setResultados] = useState<ResultadosROIP | null>(null);
  const [dadosOriginais, setDadosOriginais] = useState<DadosFormulario | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLatest, setLoadingLatest] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [pendingDados, setPendingDados] = useState<DadosFormulario | null>(null);
  const [dadosCarregados, setDadosCarregados] = useState<DadosFormulario | null>(null);
  const [captureData, setCaptureData] = useState<{ nomeEmpresa: string; email: string } | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Load latest simulation automatically OR handle view/edit params
  useEffect(() => {
    const loadSimulation = async () => {
      const isView = searchParams.get('view') === 'true';
      const isEdit = searchParams.get('edit') === 'true';
      const isNew = searchParams.get('new') === 'true';

      // If explicitly requesting new simulation, skip loading
      if (isNew) {
        setLoadingLatest(false);
        return;
      }

      // Handle view from localStorage (existing behavior)
      if (isView) {
        const stored = localStorage.getItem('loadedSimulation');
        if (stored) {
          try {
            const { resultados: storedResultados, dadosOriginais: storedDados } = JSON.parse(stored);
            const resultadosCorrigidos = {
              ...storedResultados,
              cenariosEconomia: recalcularCenariosEconomia(storedResultados, storedDados)
            };
            setResultados(resultadosCorrigidos);
            setDadosOriginais(storedDados);
            localStorage.removeItem('loadedSimulation');
          } catch (e) {
            console.error('Erro ao carregar simulação:', e);
          }
        }
        setLoadingLatest(false);
        return;
      }

      // Handle edit from localStorage (existing behavior)
      if (isEdit) {
        const stored = localStorage.getItem('editSimulation');
        if (stored) {
          try {
            const dados = JSON.parse(stored);
            setDadosCarregados(dados);
            localStorage.removeItem('editSimulation');
          } catch (e) {
            console.error('Erro ao carregar dados para edição:', e);
          }
        }
        setLoadingLatest(false);
        return;
      }

      // Load latest simulation from database automatically
      if (!user) {
        setLoadingLatest(false);
        return;
      }

      try {
        let query = supabase
          .from('roip_simulations')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);

        query = account?.id
          ? query.eq('account_id', account.id)
          : query.eq('user_id', user.id);

        const { data: latestSim } = await query.maybeSingle();

        if (latestSim) {
          const storedResultados = (latestSim.resultados_calculadora as any)?.resultados;
          const storedDados = latestSim.dados_simulacao as unknown as DadosFormulario;

          if (storedResultados && storedDados) {
            const resultadosCorrigidos = {
              ...storedResultados,
              cenariosEconomia: recalcularCenariosEconomia(storedResultados, storedDados)
            };
            setResultados(resultadosCorrigidos);
            setDadosOriginais(storedDados);
            setCaptureData({ nomeEmpresa: latestSim.nome_empresa || 'Empresa', email: user.email || '' });
          }
        }
      } catch (error) {
        console.error('Erro ao carregar última simulação:', error);
      } finally {
        setLoadingLatest(false);
      }
    };

    loadSimulation();
  }, [user, account?.id, searchParams]);

  const handleCalcular = async (dados: DadosFormulario) => {
    // Use logged-in user data automatically
    const nomeEmpresa = account?.name || 'Empresa';
    const email = user?.email || '';
    const capture = { nomeEmpresa, email };
    
    setPendingDados(dados);
    setCaptureData(capture);
    await executeCalculation(dados, capture);
  };

  const executeCalculation = async (dados: DadosFormulario, capture: { nomeEmpresa: string; email: string }) => {
    setLoading(true);

    // Mensagens de progresso
    const messages = [
      '🧮 Analisando dados da empresa...',
      '📊 Calculando impacto de ROIP...',
      '💰 Projetando retorno sobre investimento...',
      '✅ Finalizando análise...'
    ];

    try {
      // Simular progresso com mensagens (4 segundos total)
      for (let i = 0; i < messages.length; i++) {
        setLoadingMessage(messages[i]);
        setLoadingProgress((i + 1) * 25);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1s por mensagem
      }

      const resultadosCalculados = calcularROIP(dados);
      setResultados(resultadosCalculados);
      setDadosOriginais(dados);

      // Salvar simulação no banco de dados E localStorage
      try {
        // Primeiro, salvar no banco de dados para o usuário logado
        if (user) {
          const insertData = {
            user_id: user.id,
            account_id: account?.id || null,
            nome_empresa: capture.nomeEmpresa,
            dados_simulacao: JSON.parse(JSON.stringify(dados)),
            resultados_calculadora: JSON.parse(JSON.stringify({
              resultados: resultadosCalculados,
              dadosOriginais: dados
            }))
          };
          
          const { data: dbSimulation, error: dbError } = await supabase
            .from('roip_simulations')
            .insert(insertData)
            .select()
            .single();

          if (dbError) {
            console.error('Erro ao salvar simulação no banco:', dbError);
            toast.error('Simulação calculada, mas erro ao salvar no banco');
          } else {
            console.log('Simulação salva no banco:', dbSimulation.id);
            toast.success('Simulação salva com sucesso!');
          }
        }

        // Também manter no localStorage para compatibilidade
        const savedSimulations = JSON.parse(localStorage.getItem('roip_simulations') || '[]');
        const newSimulation = {
          id: `sim_${Date.now()}`,
          nome_empresa: capture.nomeEmpresa,
          email: capture.email,
          created_at: new Date().toISOString(),
          dados_simulacao: dados,
          resultados_calculadora: {
            resultados: resultadosCalculados,
            dadosOriginais: dados
          }
        };
        savedSimulations.push(newSimulation);
        localStorage.setItem('roip_simulations', JSON.stringify(savedSimulations));
      } catch (err) {
        console.error('Erro ao salvar simulação:', err);
      }

      setPendingDados(null);
      setLoadingMessage('');
      setLoadingProgress(0);
    } catch (error) {
      console.error('Erro ao calcular ROIP:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResultados(null);
    setDadosOriginais(null);
    setDadosCarregados(null);
    setCaptureData(null);
    // Navigate with ?new=true to prevent auto-loading last simulation
    navigate('/diagnostico/calculadora-roip?new=true');
  };

  const handleLoadSimulation = (dados: any) => {
    setDadosCarregados(dados);
    setResultados(null);
    setDadosOriginais(null);
  };

  const handleEditSimulation = () => {
    setDadosCarregados(dadosOriginais);
    setResultados(null);
  };

  // Show loading while checking for latest simulation
  if (loadingLatest) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Calculator className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      {loading && <LoadingCalculation message={loadingMessage} progress={loadingProgress} />}

      {/* Mobile Header */}
      <div className="md:hidden bg-primary text-primary-foreground p-4">
        <div className="flex items-center gap-2 mb-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/')}
            className="text-primary-foreground hover:bg-primary-foreground/10 -ml-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Calculator className="h-6 w-6" />
          <h1 className="text-lg font-bold">Calculadora ROIP™</h1>
        </div>
        <p className="text-primary-foreground/80 text-sm ml-10">
          Descubra o potencial de economia da sua empresa
        </p>
      </div>

      {!resultados ? (
        <div className="flex min-h-[calc(100vh-80px)] md:min-h-screen">
          {/* Left Panel - Branding (Dark) */}
          <div className="hidden md:flex md:w-2/5 bg-primary text-primary-foreground p-8 flex-col justify-between relative overflow-hidden">
            {/* Decorative gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary-foreground/10" />
            
            <div className="relative z-10">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/')}
                className="text-primary-foreground hover:bg-primary-foreground/10 mb-4 -ml-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para Home
              </Button>
              <div className="flex items-center gap-3 mb-8">
                <div className="h-12 w-12 bg-primary-foreground/10 rounded-xl flex items-center justify-center">
                  <Calculator className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Calculadora</h1>
                  <p className="text-primary-foreground/80 text-sm">ROIP™</p>
                </div>
              </div>

              <div className="space-y-6">
                <p className="text-lg leading-relaxed text-primary-foreground/90">
                  Descubra o impacto financeiro real da rotatividade e desengajamento 
                  na sua empresa com base em dados reais de mercado.
                </p>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <BarChart3 className="h-5 w-5 mt-1 text-primary-foreground/70" />
                    <div>
                      <p className="font-medium">Análise Precisa</p>
                      <p className="text-sm text-primary-foreground/70">Cálculos baseados em benchmarks de mercado</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 mt-1 text-primary-foreground/70" />
                    <div>
                      <p className="font-medium">Dados Reais</p>
                      <p className="text-sm text-primary-foreground/70">Metodologia validada por especialistas em RH</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 mt-1 text-primary-foreground/70" />
                    <div>
                      <p className="font-medium">Resultados Imediatos</p>
                      <p className="text-sm text-primary-foreground/70">Relatório completo com projeções de ROI</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="relative z-10 text-sm text-primary-foreground/60">
              Mais de 500+ empresas já descobriram seu potencial de economia
            </p>
          </div>

          {/* Right Panel - Form (White) */}
          <div className="flex-1 bg-background p-4 md:p-8 overflow-y-auto">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Simule o ROI em Pessoas</h2>
                  <p className="text-muted-foreground text-sm">Preencha os dados da sua empresa para começar</p>
                </div>
                <SimulationSearchButton onClick={() => setShowSearchModal(true)} />
              </div>

              <ROIPForm onSubmit={handleCalcular} loading={loading} dadosIniciais={dadosCarregados} />
            </div>
          </div>
        </div>
      ) : (
        /* Dashboard view */
        <div className="p-4 md:p-8">
          <div className="max-w-6xl mx-auto mb-4 flex flex-wrap items-center justify-between gap-2">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/diagnostico')}
              className="text-muted-foreground hover:text-foreground -ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Onboarding
            </Button>
            <div className="flex flex-wrap gap-2">
              <SimulationSelector 
                currentSimulationName={captureData?.nomeEmpresa}
                onSelect={(newResultados, newDados, nomeEmpresa) => {
                  setResultados(newResultados);
                  setDadosOriginais(newDados);
                  setCaptureData({ nomeEmpresa, email: user?.email || '' });
                }}
              />
              <Button 
                variant="default"
                onClick={handleReset}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Simulação
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/roip/calculadora-evolution')}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Ver Evolução
              </Button>
            </div>
          </div>
          <ROIPDashboard
            resultados={resultados}
            dadosOriginais={dadosOriginais!}
            nomeEmpresa={captureData?.nomeEmpresa || 'Empresa'}
            onEditSimulation={handleEditSimulation}
            isSharedView={false}
          />

          {/* Footer */}
          <footer className="mt-12 border-t pt-8 text-center">
            <div className="max-w-4xl mx-auto px-4">
              <div className="grid md:grid-cols-2 gap-8 text-left mb-8">
                <div>
                  <h3 className="font-semibold mb-2 text-foreground">Sobre a Calculadora ROIP™</h3>
                  <p className="text-sm text-muted-foreground">
                    A Calculadora ROIP™ é uma ferramenta desenvolvida para ajudar empresas a 
                    quantificarem o retorno financeiro dos investimentos em gestão de pessoas. Baseada em 
                    metodologias comprovadas e dados de mercado, oferece insights valiosos para decisões estratégicas.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-foreground">Código de Cultura</h3>
                  <p className="text-sm text-muted-foreground">
                    Transformando gestão de pessoas em resultados financeiros mensuráveis.
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                © {new Date().getFullYear()} Código de Cultura. Todos os direitos reservados.
                ROIP™ é uma metodologia proprietária.
              </p>
            </div>
          </footer>
        </div>
      )}

      {/* Modals */}
      <SimulationSearchModal
        open={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onLoadSimulation={handleLoadSimulation}
      />
    </div>
  );
};

export default CalculadoraROIP;
