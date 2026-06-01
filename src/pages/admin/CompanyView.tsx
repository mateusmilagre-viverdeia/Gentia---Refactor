import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAdminDashboard, CompanyDetails, ValuesDetail, DecisionDetail, ProjectsDetail, EnergyDetail, DevelopmentDetail, EventDetail, RitualDetail, IndicatorsDetail } from '@/hooks/useAdminDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Shield, Loader2, Download } from 'lucide-react';
import { AdminMissionView } from '@/components/admin/views/AdminMissionView';
import { AdminVisionView } from '@/components/admin/views/AdminVisionView';
import { AdminValuesView } from '@/components/admin/views/AdminValuesView';
import { AdminIndicatorsView } from '@/components/admin/views/AdminIndicatorsView';
import { AdminProjectsView } from '@/components/admin/views/AdminProjectsView';
import { AdminEnergyView } from '@/components/admin/views/AdminEnergyView';
import { AdminDevelopmentView } from '@/components/admin/views/AdminDevelopmentView';
import { AdminDecisionView } from '@/components/admin/views/AdminDecisionView';
import { AdminSummaryView } from '@/components/admin/views/AdminSummaryView';

interface AllCompanyData {
  details: CompanyDetails | null;
  values: ValuesDetail | null;
  decision: DecisionDetail | null;
  projects: ProjectsDetail[] | null;
  energy: EnergyDetail | null;
  development: DevelopmentDetail | null;
  event: EventDetail | null;
  ritual: RitualDetail | null;
  indicators: IndicatorsDetail | null;
}

export default function AdminCompanyView() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { 
    isSuperAdmin, 
    getCompanyDetails, 
    getValuesDetail, 
    getDecisionDetail,
    getProjectsDetail,
    getEnergyDetail,
    getDevelopmentDetail,
    getEventDetail,
    getRitualDetail,
    getIndicatorsDetail
  } = useAdminDashboard();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('resumo');
  const [data, setData] = useState<AllCompanyData>({
    details: null,
    values: null,
    decision: null,
    projects: null,
    energy: null,
    development: null,
    event: null,
    ritual: null,
    indicators: null,
  });

  useEffect(() => {
    const loadAllData = async () => {
      if (!companyId) return;
      
      setLoading(true);
      try {
        const [details, values, decision, projects, energy, development, event, ritual, indicators] = await Promise.all([
          getCompanyDetails(companyId),
          getValuesDetail(companyId),
          getDecisionDetail(companyId),
          getProjectsDetail(companyId),
          getEnergyDetail(companyId),
          getDevelopmentDetail(companyId),
          getEventDetail(companyId),
          getRitualDetail(companyId),
          getIndicatorsDetail(companyId),
        ]);
        
        setData({ details, values, decision, projects, energy, development, event, ritual, indicators });
      } catch (err) {
        console.error('Error loading company data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadAllData();
  }, [companyId, getCompanyDetails, getValuesDetail, getDecisionDetail, getProjectsDetail, getEnergyDetail, getDevelopmentDetail, getEventDetail, getRitualDetail, getIndicatorsDetail]);

  if (!isSuperAdmin) {
    return (
      <AppLayout title="Acesso Negado">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout title="Carregando...">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const companyName = data.details?.company?.name || 'Empresa';

  return (
    <AppLayout title={companyName}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between print:hidden">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>

        {/* Admin Mode Banner */}
        <Alert className="border-amber-200 bg-amber-50 print:hidden">
          <Shield className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Modo Administrador</strong> - Visualização apenas leitura do projeto de cultura da empresa.
          </AlertDescription>
        </Alert>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-9 w-full print:hidden">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="missao">Missão</TabsTrigger>
            <TabsTrigger value="visao">Visão</TabsTrigger>
            <TabsTrigger value="valores">Valores</TabsTrigger>
            <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
            <TabsTrigger value="projetos">Projetos</TabsTrigger>
            <TabsTrigger value="energia">Energia</TabsTrigger>
            <TabsTrigger value="desenvolvimento">Desenvolv.</TabsTrigger>
            <TabsTrigger value="decisao">Decisão</TabsTrigger>
          </TabsList>

          <TabsContent value="resumo">
            <AdminSummaryView data={data} />
          </TabsContent>

          <TabsContent value="missao">
            <AdminMissionView mission={data.details?.mission} />
          </TabsContent>

          <TabsContent value="visao">
            <AdminVisionView vision={data.details?.vision} />
          </TabsContent>

          <TabsContent value="valores">
            <AdminValuesView values={data.values} />
          </TabsContent>

          <TabsContent value="indicadores">
            <AdminIndicatorsView indicators={data.indicators} />
          </TabsContent>

          <TabsContent value="projetos">
            <AdminProjectsView projects={data.projects} />
          </TabsContent>

          <TabsContent value="energia">
            <AdminEnergyView energy={data.energy} />
          </TabsContent>

          <TabsContent value="desenvolvimento">
            <AdminDevelopmentView development={data.development} />
          </TabsContent>

          <TabsContent value="decisao">
            <AdminDecisionView decision={data.decision} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
