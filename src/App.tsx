import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SalesDemoProvider } from "@/components/sales-demo/SalesDemoProvider";
import { SalesDemoPanel } from "@/components/sales-demo/SalesDemoPanel";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { toast } from "sonner";
import { UserProvider } from "@/contexts/UserContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { BillingProvider } from "@/contexts/BillingContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { BillingGate } from "@/components/billing/BillingGate";
import { OnboardingGate } from "@/components/auth/OnboardingGate";
import { useCacheVersion } from "@/hooks/useCacheVersion";
import { ThemeProvider } from "@/components/theme";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useOrganization } from "@/contexts/OrganizationContext";
import { PASSWORD_RECOVERY_PATH, isPasswordRecoverySession } from "@/lib/passwordRecovery";

// Pages
import Home from "./pages/Home";
import Jornadas from "./pages/Jornadas";
import Conquistas from "./pages/Conquistas";
import MinhaEmpresa from "./pages/MinhaEmpresa";
import CriacaoDeCultura from "./pages/cultura/CriacaoDeCultura";
import EventoDeCultura from "./pages/cultura/EventoDeCultura";
import RituaisDeCultura from "./pages/cultura/RituaisDeCultura";
import CriadorCultureCode from "./pages/cultura/CriadorCultureCode";
import BibliotecaCultura from "./pages/cultura/BibliotecaCultura";
import ModelosCultura from "./pages/cultura/ModelosCultura";
import PublicCultureCodeViewer from "./pages/cultura/PublicCultureCodeViewer";
import Login from "./pages/auth/Login";
import Registrar from "./pages/auth/Registrar";
import EsqueciSenha from "./pages/auth/EsqueciSenha";
import RedefinirSenha from "./pages/auth/RedefinirSenha";
import Perfil from "./pages/conta/Perfil";
import Usuarios from "./pages/conta/Usuarios";
import Permissoes from "./pages/conta/Permissoes";
import Notificacoes from "./pages/conta/Notificacoes";
import Comunicados from "./pages/conta/Comunicados";
import ComunicadoDetalhes from "./pages/conta/ComunicadoDetalhes";
import Billing from "./pages/conta/Billing";
import Faturas from "./pages/conta/Faturas";
import AcceptInvite from "./pages/app/AcceptInvite";
import AcceptEPInvite from "./pages/app/AcceptEPInvite";
import PendingApproval from "./pages/app/PendingApproval";
import ClaimGrant from "./pages/app/ClaimGrant";
import AccessRequests from "./pages/app/AccessRequests";
import ComingSoon from "./pages/ComingSoon";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminBilling from "./pages/admin/AdminBilling";
import AdminLlmCosts from "./pages/admin/LlmCosts";
import AdminFinancialReport from "./pages/admin/FinancialReport";
import AdminAIBillingAudit from "./pages/admin/AIBillingAudit";
import AdminAIBillingHealth from "./pages/admin/AIBillingHealth";
import AdminVoiceInterviewSimulator from "./pages/admin/VoiceInterviewSimulator";
import AdminVoiceInterviewsMonitoring from "./pages/admin/VoiceInterviewsMonitoring";
import AdminShadowEvaluation from "./pages/admin/ShadowEvaluation";
import InterviewDebugPage from "./pages/admin/InterviewDebug";
import AdminCompanyView from "./pages/admin/CompanyView";
import TalentPoolPage from "./pages/recruitment/TalentPoolPage";
import PesquisaMercadoHub from "./pages/recruitment/pesquisa-mercado/PesquisaMercadoHub";
import PesquisaMercadoNovo from "./pages/recruitment/pesquisa-mercado/PesquisaMercadoNovo";
import PesquisaMercadoView from "./pages/recruitment/pesquisa-mercado/PesquisaMercadoView";
import PublicMarketReportPage from "./pages/recruitment/pesquisa-mercado/PublicMarketReportPage";
import AdminConsultores from "./pages/admin/Consultores";
import AdminGrants from "./pages/admin/Grants";
import AdminUsuarios from "./pages/admin/AdminUsuarios";
import AdminSeatGrants from "./pages/admin/SeatGrants";
import AdminPendingInvites from "./pages/admin/PendingInvites";
import BackupExport from "./pages/admin/BackupExport";
import PlatformSettings from "./pages/admin/PlatformSettings";
import PricingAdmin from "./pages/admin/PricingAdmin";
import CreditGrantsAdmin from "./pages/admin/CreditGrants";
import AccountHealth from "./pages/admin/AccountHealth";
import AdminCandidatesOverview from "./pages/admin/CandidatesOverview";
import Atracao from "./pages/atracao-contratacao/Atracao";
import Contratacao from "./pages/atracao-contratacao/Contratacao";
import FunilContratacao from "./pages/atracao-contratacao/FunilContratacao";
import PerguntasValores from "./pages/atracao-contratacao/PerguntasValores";
import Organograma from "./pages/atracao-contratacao/Organograma";
import JobDescription from "./pages/atracao-contratacao/JobDescription";
import AnalisadorPessoas from "./pages/retencao/AnalisadorPessoas";
import AvaliacaoDesempenho from "./pages/retencao/AvaliacaoDesempenho";
import HabilidadeUnica from "./pages/retencao/HabilidadeUnica";
import MaturidadeTime from "./pages/retencao/MaturidadeTime";
import Questionarios from "./pages/retencao/Questionarios";
import ResponderQuestionario from "./pages/retencao/ResponderQuestionario";
import PeoplePerformance from "./pages/retencao/PeoplePerformance";
import AssessmentDISC from "./pages/retencao/AssessmentDISC";
import DISCTeamDashboard from "./pages/retencao/DISCTeamDashboard";
import AssessmentQA from "./pages/retencao/AssessmentQA";
import QATeamDashboard from "./pages/retencao/QATeamDashboard";
import OnboardingHub from "./pages/retencao/OnboardingHub";
import OnboardingWizard from "./pages/retencao/OnboardingWizard";
import OnboardingDetail from "./pages/retencao/OnboardingDetail";
import OffboardingHub from "./pages/retencao/OffboardingHub";
import OffboardingNew from "./pages/retencao/OffboardingNew";
import OffboardingDetail from "./pages/retencao/OffboardingDetail";
import OffboardingDashboard from "./pages/retencao/OffboardingDashboard";
import ExitSurveyPublic from "./pages/offboarding/ExitSurveyPublic";
import PulseDaily from "./pages/pulse/PulseDaily";
import PulseHistory from "./pages/pulse/PulseHistory";
import PulseAdmin from "./pages/pulse/PulseAdmin";
import PulseDashboard from "./pages/pulse/PulseDashboard";
import PulseLeaderDashboard from "./pages/pulse/PulseLeaderDashboard";
import PulseActions from "./pages/pulse/PulseActions";
import PulseHub from "./pages/pulse/PulseHub";
import PulseSurveys from "./pages/pulse/PulseSurveys";
import PulseCultureDashboard from "./pages/pulse/PulseCultureDashboard";

// ROIP Assessment
import AssessmentROIP from "./pages/app/assessment/AssessmentROIP";
import AssessmentHistory from "./pages/app/roip/AssessmentHistory";
import ROIPEvolutionDashboard from "./pages/roip/ROIPEvolutionDashboard";
import CalculadoraEvolutionDashboard from "./pages/roip/CalculadoraEvolutionDashboard";

// Hub Pages
import DiagnosticoHub from "./pages/diagnostico/DiagnosticoHub";
import CalculadoraROIP from "./pages/diagnostico/CalculadoraROIP";
import PlanoImplementacao from "./pages/diagnostico/PlanoImplementacao";
import CulturaHub from "./pages/cultura/CulturaHub";
import AtracaoHub from "./pages/atracao-contratacao/AtracaoHub";
import EvolutionHub from "./pages/retencao/evolucao/EvolutionHub";
import EvolutionWizard from "./pages/retencao/evolucao/EvolutionWizard";
import EvolutionCycleDetail from "./pages/retencao/evolucao/EvolutionCycleDetail";
import RetencaoHub from "./pages/retencao/RetencaoHub";
import EducacaoHub from "./pages/educacao/EducacaoHub";
import CursoDetalhe from "./pages/educacao/CursoDetalhe";
import CargosESalarios from "./pages/retencao/CargosESalarios";
import OneOnOneHub from "./pages/retencao/OneOnOneHub";
import OneOnOneNew from "./pages/retencao/OneOnOneNew";
import OneOnOneMeeting from "./pages/retencao/OneOnOneMeeting";

// Recruitment Module
import RecruitmentHome from "./pages/recruitment/RecruitmentHome";
import CandidatesPage from "./pages/recruitment/CandidatesPage";
import JobsPage from "./pages/recruitment/JobsPage";
import JobDetailsPage from "./pages/recruitment/JobDetailsPage";
import InterviewsPage from "./pages/recruitment/InterviewsPage";
import ApplicationsPage from "./pages/recruitment/ApplicationsPage";
import AgentDetailsPage from "./pages/recruitment/AgentDetailsPage";
import AgentTestPage from "./pages/recruitment/AgentTestPage";
import CultureAdherenceAuditPage from "./pages/recruitment/CultureAdherenceAuditPage";
import ClientsPage from "./pages/recruitment/ClientsPage";
import ClientDetailsPage from "./pages/recruitment/ClientDetailsPage";
import CareersPage from "./pages/recruitment/CareersPage";
import RecruitmentAnalytics from "./pages/recruitment/RecruitmentAnalytics";
import RecruitmentSettings from "./pages/recruitment/RecruitmentSettings";
import AIObservabilityPage from "./pages/recruitment/AIObservability";
import InterviewHealthPage from "./pages/recruitment/InterviewHealthPage";
import RecruitmentExternalEntries from "./pages/recruitment/RecruitmentExternalEntries";
import AnalyticsDashboard from "./pages/recruitment/AnalyticsDashboard";
import HuntingOutreachPage from "./pages/recruitment/HuntingOutreachPage";
import HuntingConfigPage from "./pages/recruitment/HuntingConfigPage";
import FinanceiroPage from "./pages/recruitment/FinanceiroPage";

// Note: Settings pages removed - using redirects to /conta/* routes instead
import CareersPageSettings from "./pages/settings/CareersPageSettings";

// Public Pages
import JobApplicationPage from "./pages/public/JobApplicationPage";
import CandidateInterviewPage from "./pages/public/CandidateInterviewPage";
import PublicJobPage from "./pages/public/PublicJobPage";
import CandidateDISCAssessment from "./pages/public/CandidateDISCAssessment";
import ShortlistReportViewer from "./pages/public/ShortlistReportViewer";
import TechnicalInterviewPage from "./pages/public/TechnicalInterviewPage";
import NpsResponsePage from "./pages/public/NpsResponsePage";
import ROIReportPage from "./pages/public/ROIReportPage";
// Employer Portal Pages
import EmployerJobsPage from "./pages/employer/EmployerJobsPage";
import EmployerApprovedCandidatesPage from "./pages/employer/EmployerApprovedCandidatesPage";
import EmployerReportsPage from "./pages/employer/EmployerReportsPage";
import { useAccount } from "@/hooks/useAccount";
// Candidate Pages
import CandidateHome from "./pages/candidate/CandidateHome";
import CandidateChangePassword from "./pages/candidate/CandidateChangePassword";
import MinhaBiografia from "./pages/candidato/MinhaBiografia";
import AplicarVaga from "./pages/candidato/AplicarVaga";
import CandidatePreferencesPage from "./pages/candidate/PreferencesPage";
import { CandidateProfileProvider } from "./contexts/CandidateProfileContext";
// Consultant Pages
import ConsultantDashboard from "./pages/consultor/Dashboard";
import HeadCSDashboard from "./pages/consultor/HeadCSDashboard";
import TimeTracking from "./pages/consultor/TimeTracking";
import PlaybooksManagement from "./pages/consultor/PlaybooksManagement";

// Consultoria Hub Pages
import ConsultoriaHub from "./pages/consultoria/ConsultoriaHub";
import ConsultoriaGestao from "./pages/consultoria/ConsultoriaGestao";
import ConsultoriaMeusProjetos from "./pages/consultoria/ConsultoriaMeusProjetos";
import ConsultoriaEquipe from "./pages/consultoria/ConsultoriaEquipe";
import ConsultoriaConvites from "./pages/consultoria/ConsultoriaConvites";
import PropostasComerciais from "./pages/consultoria/PropostasComerciais";
import ConsultoriaAvaliacoes from "./pages/consultoria/ConsultoriaAvaliacoes";
import SatisfactionSurvey from "./pages/public/SatisfactionSurvey";
import PropostaPublica from "./pages/PropostaPublica";

// Sócio EP Pages
import SocioDashboard from "./pages/socio/Dashboard";
import SocioClientes from "./pages/socio/Clientes";
import SocioRoyalties from "./pages/socio/Royalties";
import SocioFinanceiro from "./pages/socio/Financeiro";
import SocioUsuarios from "./pages/socio/Usuarios";
import SocioProjetosPage from "./pages/socio/Projetos";

// Admin EP Partner Pages
import AdminSocios from "./pages/admin/Socios";
import AdminRoyalties from "./pages/admin/AdminRoyalties";
import SupportDashboard from "./pages/admin/SupportDashboard";


// Support Pages
import MyTickets from "./pages/support/MyTickets";
import TicketDetail from "./pages/support/TicketDetail";

// Intranet Pages
import IntranetPage from "./pages/intranet/IntranetPage";
import BirthdaysPage from "./pages/intranet/BirthdaysPage";
import MetricsDashboardPage from "./pages/intranet/MetricsDashboardPage";
import TeamDirectoryPage from "./pages/intranet/TeamDirectoryPage";
import ClientProject from "./pages/consultor/ClientProject";
import ClientPortalProject from "./pages/portal/ClientPortalProject";
import ClientPortalPage from "./pages/portal/ClientPortalPage";
import CareersPublicPage from "./pages/careers/CareersPublicPage";
import CareersJobPage from "./pages/careers/CareersJobPage";
import CareersApplySuccessPage from "./pages/careers/CareersApplySuccessPage";
import PortfolioAnalytics from "./pages/consultor/PortfolioAnalytics";
import { RequireCandidateEmail } from "./components/recruitment/RequireCandidateEmail";

// Public mini-site (Gent.IA marketing)
import PublicSiteLayout from "./layouts/PublicSiteLayout";
import LandingPage from "./pages/lp/LandingPage";
import SolucaoPage from "./pages/lp/SolucaoPage";
import PrecosPage from "./pages/lp/PrecosPage";
import SobrePage from "./pages/lp/SobrePage";

const queryClient = new QueryClient();

// Cache version check component
const CacheVersionCheck = ({ children }: { children: React.ReactNode }) => {
  useCacheVersion();
  return <>{children}</>;
};

// Protected Route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isPasswordRecoverySession() && location.pathname !== PASSWORD_RECOVERY_PATH) {
    return <Navigate to={PASSWORD_RECOVERY_PATH} replace />;
  }

  return <>{children}</>;
};

// Blocks EP/admin areas while a consultant is inside a client context.
// Exception: allow /consultor/projeto/* (entry page) so the consultant can reach the client.
const ConsultantModeRouteBlock = ({ children }: { children: React.ReactNode }) => {
  const { isConsultantMode } = useOrganization();
  const location = useLocation();

  if (!isConsultantMode) return <>{children}</>;

  const path = location.pathname;
  const isAdminArea = path.startsWith("/admin");
  const isSocioArea = path.startsWith("/socio");
  const isConsultorArea = path.startsWith("/consultor") && !path.startsWith("/consultor/projeto");

  if (isAdminArea || isSocioArea || isConsultorArea) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Guard for employer-type accounts: forces them into /employer/* routes
const EmployerRouteGuard = ({ children }: { children: React.ReactNode }) => {
  const { account, loading } = useAccount();
  const location = useLocation();

  if (loading) return <>{children}</>;

  const accountType = (account as any)?.account_type;
  const path = location.pathname;
  const isEmployerPath = path.startsWith("/employer/");

  if (accountType === "employer" && !isEmployerPath) {
    return <Navigate to="/employer/jobs" replace />;
  }
  if (isEmployerPath && accountType !== "employer") {
    return <Navigate to="/atracao-contratacao/recrutamento" replace />;
  }

  return <>{children}</>;
};

// Protected Route with Onboarding + Billing Gate (for most app routes)
const ProtectedBillingRoute = ({ children }: { children: React.ReactNode }) => {
  return (
    <ProtectedRoute>
      <EmployerRouteGuard>
        <OnboardingGate>
          <BillingGate>
            {children}
          </BillingGate>
        </OnboardingGate>
      </EmployerRouteGuard>
    </ProtectedRoute>
  );
};

const ProtectedEmployerRoute = ({ children }: { children: React.ReactNode }) => {
  return (
    <ProtectedRoute>
      <EmployerRouteGuard>{children}</EmployerRouteGuard>
    </ProtectedRoute>
  );
};

const TemporaryPasswordNotice = () => {
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (user?.user_metadata?.must_change_password === true && location.pathname !== "/conta/perfil") {
      toast.warning("Você entrou com uma senha temporária. Altere sua senha em Conta → Perfil.", { duration: 8000 });
    }
  }, [user?.id, user?.user_metadata?.must_change_password, location.pathname]);

  return null;
};

// Root route: landing page for guests, Home dashboard for authenticated users.
const RootRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <ProtectedBillingRoute>
        <Home />
      </ProtectedBillingRoute>
    );
  }

  return (
    <PublicSiteLayout>
      <LandingPage />
    </PublicSiteLayout>
  );
};

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <OrganizationProvider>
            <BillingProvider>
              <ImpersonationProvider>
                <UserProvider>
                  <CacheVersionCheck>
                    <TooltipProvider>
                    <SalesDemoProvider>
                    <Toaster />
                    <Sonner />
                    <TemporaryPasswordNotice />
                    <SalesDemoPanel />
                  <Routes>
                {/* Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/auth/login" element={<Navigate to="/login" replace />} />
                <Route path="/auth/registrar" element={<Registrar />} />
                <Route path="/auth/esqueci-senha" element={<EsqueciSenha />} />
                <Route path="/auth/redefinir-senha" element={<RedefinirSenha />} />
                <Route path="/reset-password" element={<Navigate to="/auth/redefinir-senha" replace />} />
                <Route path="/auth/reset-password" element={<Navigate to="/auth/redefinir-senha" replace />} />

                {/* Root: landing page (guest) or dashboard (authenticated) */}
                <Route path="/" element={<RootRoute />} />
                <Route path="/jornadas" element={<ProtectedBillingRoute><Jornadas /></ProtectedBillingRoute>} />
                <Route path="/conquistas" element={<ProtectedBillingRoute><Conquistas /></ProtectedBillingRoute>} />
                <Route path="/minha-empresa" element={<ProtectedBillingRoute><MinhaEmpresa /></ProtectedBillingRoute>} />

                {/* Protected Routes - Coming Soon */}
                <Route path="/plano-de-acao" element={<ProtectedBillingRoute><ComingSoon pageName="Plano de Ação" /></ProtectedBillingRoute>} />

                {/* Intranet Routes */}
                <Route path="/intranet" element={<ProtectedBillingRoute><IntranetPage /></ProtectedBillingRoute>} />
                <Route path="/intranet/aniversariantes" element={<ProtectedBillingRoute><BirthdaysPage /></ProtectedBillingRoute>} />
                <Route path="/intranet/metricas" element={<ProtectedBillingRoute><MetricsDashboardPage /></ProtectedBillingRoute>} />
                <Route path="/intranet/diretorio" element={<ProtectedBillingRoute><TeamDirectoryPage /></ProtectedBillingRoute>} />

                {/* Diagnóstico Routes - Hub + Individual */}
                <Route path="/diagnostico" element={<ProtectedBillingRoute><DiagnosticoHub /></ProtectedBillingRoute>} />
                <Route path="/diagnostico/calculadora-roip" element={<ProtectedBillingRoute><CalculadoraROIP /></ProtectedBillingRoute>} />
                <Route path="/diagnostico/plano-implementacao" element={<ProtectedBillingRoute><PlanoImplementacao /></ProtectedBillingRoute>} />
                
                {/* ROIP Assessment Routes */}
                <Route path="/app/assessment/roip" element={<ProtectedBillingRoute><AssessmentROIP /></ProtectedBillingRoute>} />
                <Route path="/app/assessment/roip/history" element={<ProtectedBillingRoute><AssessmentHistory /></ProtectedBillingRoute>} />
                <Route path="/roip/evolution" element={<ProtectedBillingRoute><ROIPEvolutionDashboard /></ProtectedBillingRoute>} />
                <Route path="/roip/calculadora-evolution" element={<ProtectedBillingRoute><CalculadoraEvolutionDashboard /></ProtectedBillingRoute>} />

                {/* Cultura Routes - Hub + Individual */}
                <Route path="/cultura" element={<ProtectedBillingRoute><CulturaHub /></ProtectedBillingRoute>} />
                <Route path="/cultura/criacao" element={<ProtectedBillingRoute><CriacaoDeCultura /></ProtectedBillingRoute>} />
                <Route path="/cultura/criacao-de-cultura" element={<ProtectedBillingRoute><CriacaoDeCultura /></ProtectedBillingRoute>} />
                <Route path="/cultura/evento" element={<ProtectedBillingRoute><EventoDeCultura /></ProtectedBillingRoute>} />
                <Route path="/cultura/rituais" element={<ProtectedBillingRoute><RituaisDeCultura /></ProtectedBillingRoute>} />
                <Route path="/cultura/criador-culture-code" element={<ProtectedBillingRoute><CriadorCultureCode /></ProtectedBillingRoute>} />
                <Route path="/cultura/biblioteca" element={<ProtectedBillingRoute><BibliotecaCultura /></ProtectedBillingRoute>} />
                <Route path="/cultura/modelos" element={<ProtectedBillingRoute><ModelosCultura /></ProtectedBillingRoute>} />
                <Route path="/cultura/compartilhado/:token" element={<PublicCultureCodeViewer />} />

                {/* Atração e Contratação Routes - Hub + Individual */}
                <Route path="/atracao-contratacao" element={<ProtectedBillingRoute><AtracaoHub /></ProtectedBillingRoute>} />
                <Route path="/atracao-contratacao/atracao" element={<ProtectedBillingRoute><Atracao /></ProtectedBillingRoute>} />
                <Route path="/atracao-contratacao/contratacao" element={<ProtectedBillingRoute><Contratacao /></ProtectedBillingRoute>} />
                <Route path="/atracao-contratacao/contratacao/funil" element={<ProtectedBillingRoute><FunilContratacao /></ProtectedBillingRoute>} />
                <Route path="/atracao-contratacao/contratacao/perguntas-valores" element={<ProtectedBillingRoute><PerguntasValores /></ProtectedBillingRoute>} />
                <Route path="/atracao-contratacao/contratacao/organograma" element={<ProtectedBillingRoute><Organograma /></ProtectedBillingRoute>} />
                <Route path="/atracao-contratacao/contratacao/job-description" element={<ProtectedBillingRoute><JobDescription /></ProtectedBillingRoute>} />

                {/* Recruitment Module Routes */}
                <Route path="/atracao-contratacao/recrutamento" element={<ProtectedBillingRoute><RecruitmentHome /></ProtectedBillingRoute>} />
                <Route path="/atracao-contratacao/recrutamento/candidates" element={<ProtectedBillingRoute><CandidatesPage /></ProtectedBillingRoute>} />
                <Route path="/atracao-contratacao/recrutamento/jobs" element={<ProtectedBillingRoute><JobsPage /></ProtectedBillingRoute>} />
                <Route path="/atracao-contratacao/recrutamento/jobs/:jobId" element={<ProtectedBillingRoute><JobDetailsPage /></ProtectedBillingRoute>} />
                <Route path="/atracao-contratacao/recrutamento/clientes" element={<ProtectedBillingRoute><ClientsPage /></ProtectedBillingRoute>} />
                <Route path="/atracao-contratacao/recrutamento/clientes/:clientId" element={<ProtectedBillingRoute><ClientDetailsPage /></ProtectedBillingRoute>} />
                <Route path="/atracao-contratacao/recrutamento/financeiro" element={<ProtectedBillingRoute><FinanceiroPage /></ProtectedBillingRoute>} />
                <Route path="/atracao-contratacao/recrutamento/interviews" element={<ProtectedBillingRoute><InterviewsPage /></ProtectedBillingRoute>} />
                <Route path="/atracao-contratacao/recrutamento/applications" element={<ProtectedBillingRoute><ApplicationsPage /></ProtectedBillingRoute>} />
                <Route path="/atracao-contratacao/recrutamento/agents/:agentId" element={<ProtectedBillingRoute><AgentDetailsPage /></ProtectedBillingRoute>} />
                <Route path="/atracao-contratacao/recrutamento/agents/:agentId/testar" element={<ProtectedBillingRoute><AgentTestPage /></ProtectedBillingRoute>} />
                <Route path="/atracao-contratacao/recrutamento/careers-settings" element={<ProtectedBillingRoute><CareersPageSettings /></ProtectedBillingRoute>} />
                <Route path="/atracao-contratacao/recrutamento/analytics" element={<ProtectedBillingRoute><AnalyticsDashboard /></ProtectedBillingRoute>} />
                <Route path="/atracao-contratacao/recrutamento/hunting-outreach" element={<ProtectedBillingRoute><HuntingOutreachPage /></ProtectedBillingRoute>} />
                <Route path="/atracao-contratacao/recrutamento/hunting-config" element={<ProtectedBillingRoute><HuntingConfigPage /></ProtectedBillingRoute>} />
                <Route path="/atracao-contratacao/recrutamento/configuracoes" element={<ProtectedBillingRoute><RecruitmentSettings /></ProtectedBillingRoute>} />
                <Route path="/atracao-contratacao/recrutamento/ai-observability" element={<ProtectedBillingRoute><AIObservabilityPage /></ProtectedBillingRoute>} />
                <Route path="/atracao-contratacao/recrutamento/auditoria-cultural" element={<ProtectedBillingRoute><CultureAdherenceAuditPage /></ProtectedBillingRoute>} />
                <Route path="/atracao-contratacao/recrutamento/interview-health" element={<ProtectedBillingRoute><InterviewHealthPage /></ProtectedBillingRoute>} />
                <Route path="/atracao-contratacao/recrutamento/talent-pool" element={<ProtectedBillingRoute><TalentPoolPage /></ProtectedBillingRoute>} />
                <Route path="/atracao-contratacao/recrutamento/pesquisa-mercado" element={<ProtectedBillingRoute><PesquisaMercadoHub /></ProtectedBillingRoute>} />
                <Route path="/atracao-contratacao/recrutamento/pesquisa-mercado/novo" element={<ProtectedBillingRoute><PesquisaMercadoNovo /></ProtectedBillingRoute>} />
                <Route path="/atracao-contratacao/recrutamento/pesquisa-mercado/:id" element={<ProtectedBillingRoute><PesquisaMercadoView /></ProtectedBillingRoute>} />
                <Route path="/atracao-contratacao/recrutamento/entradas-externas" element={<ProtectedBillingRoute><RecruitmentExternalEntries /></ProtectedBillingRoute>} />
                {/* Legacy redirects */}
                <Route path="/atracao-contratacao/recrutamento/executivo" element={<Navigate to="/atracao-contratacao/recrutamento/analytics?tab=executivo" replace />} />
                <Route path="/atracao-contratacao/recrutamento/metas" element={<Navigate to="/atracao-contratacao/recrutamento/analytics?tab=metas" replace />} />
                <Route path="/atracao-contratacao/recrutamento/benchmark" element={<Navigate to="/atracao-contratacao/recrutamento/analytics?tab=benchmark" replace />} />
                <Route path="/atracao-contratacao/recrutamento/hunting" element={<Navigate to="/atracao-contratacao/recrutamento/hunting-outreach?tab=hunting" replace />} />
                <Route path="/atracao-contratacao/recrutamento/outreach" element={<Navigate to="/atracao-contratacao/recrutamento/hunting-outreach?tab=outreach" replace />} />
                <Route path="/atracao-contratacao/recrutamento/creditos" element={<Navigate to="/atracao-contratacao/recrutamento/configuracoes?tab=creditos" replace />} />
                <Route path="/atracao-contratacao/recrutamento/agents" element={<Navigate to="/atracao-contratacao/recrutamento/configuracoes?tab=agentes" replace />} />
                <Route path="/atracao-contratacao/recrutamento/logs" element={<Navigate to="/atracao-contratacao/recrutamento/configuracoes?tab=creditos" replace />} />
                <Route path="/careers/:orgSlug" element={<CareersPage />} />
                {/* Public mini-site (Gent.IA marketing) — at root level */}
                <Route element={<PublicSiteLayout />}>
                  <Route path="/solucao" element={<SolucaoPage />} />
                  <Route path="/precos" element={<PrecosPage />} />
                  <Route path="/sobre" element={<SobrePage />} />
                </Route>
                {/* Backward-compat redirects from old /lp paths */}
                <Route path="/lp" element={<Navigate to="/" replace />} />
                <Route path="/lp/solucao" element={<Navigate to="/solucao" replace />} />
                <Route path="/lp/precos" element={<Navigate to="/precos" replace />} />
                <Route path="/lp/sobre" element={<Navigate to="/sobre" replace />} />
                {/* White-label client career pages */}
                <Route path="/c/:slug" element={<CareersPublicPage />} />
                <Route path="/c/:slug/sucesso" element={<CareersApplySuccessPage />} />
                <Route path="/c/:slug/vagas/:jobId" element={<CareersJobPage />} />
                <Route path="/vagas/:jobId" element={<PublicJobPage />} />
                <Route path="/apply/:orgSlug/:jobId" element={<JobApplicationPage />} />
                <Route path="/interview/:interviewToken" element={<RequireCandidateEmail><CandidateInterviewPage /></RequireCandidateEmail>} />
                <Route path="/interview/technical/:token" element={<RequireCandidateEmail><TechnicalInterviewPage /></RequireCandidateEmail>} />
                <Route path="/assessment/disc/:token" element={<RequireCandidateEmail><CandidateDISCAssessment /></RequireCandidateEmail>} />
                <Route path="/nps/:token" element={<NpsResponsePage />} />

                {/* Candidate Routes */}
                <Route path="/candidate" element={<CandidateProfileProvider><CandidateHome /></CandidateProfileProvider>} />
                <Route path="/candidate/alterar-senha" element={<CandidateProfileProvider><CandidateChangePassword /></CandidateProfileProvider>} />
                <Route path="/candidato/biografia" element={<CandidateProfileProvider><MinhaBiografia /></CandidateProfileProvider>} />
                <Route path="/candidato/aplicar/:jobId" element={<CandidateProfileProvider><AplicarVaga /></CandidateProfileProvider>} />
                <Route path="/candidato/preferencias" element={<CandidatePreferencesPage />} />

                {/* Settings Routes - Redirects to /conta/* */}
                <Route path="/settings" element={<Navigate to="/conta/perfil" replace />} />
                <Route path="/settings/account/profile" element={<Navigate to="/conta/perfil" replace />} />
                <Route path="/settings/account/security" element={<Navigate to="/conta/perfil" replace />} />
                <Route path="/settings/account/notifications" element={<Navigate to="/conta/notificacoes" replace />} />
                <Route path="/settings/organization/general" element={<Navigate to="/minha-empresa" replace />} />
                <Route path="/settings/organization/members" element={<Navigate to="/conta/equipe" replace />} />
                <Route path="/settings/organization/developers" element={<Navigate to="/conta/equipe" replace />} />

                {/* Retenção Routes - Hub + Individual */}
                <Route path="/retencao" element={<ProtectedBillingRoute><RetencaoHub /></ProtectedBillingRoute>} />
                <Route path="/retencao/analisador-pessoas" element={<ProtectedBillingRoute><AnalisadorPessoas /></ProtectedBillingRoute>} />
                <Route path="/retencao/avaliacao-desempenho" element={<ProtectedBillingRoute><AvaliacaoDesempenho /></ProtectedBillingRoute>} />
                <Route path="/retencao/habilidade-unica" element={<ProtectedBillingRoute><HabilidadeUnica /></ProtectedBillingRoute>} />
                <Route path="/retencao/maturidade-time" element={<ProtectedBillingRoute><MaturidadeTime /></ProtectedBillingRoute>} />
                <Route path="/retencao/people-performance" element={<ProtectedBillingRoute><PeoplePerformance /></ProtectedBillingRoute>} />
                <Route path="/retencao/questionarios" element={<ProtectedBillingRoute><Questionarios /></ProtectedBillingRoute>} />
                <Route path="/responder-questionario/:surveyId" element={<ProtectedBillingRoute><ResponderQuestionario /></ProtectedBillingRoute>} />
                <Route path="/retencao/assessment-disc" element={<ProtectedBillingRoute><AssessmentDISC /></ProtectedBillingRoute>} />
                <Route path="/retencao/assessment-disc/team-dashboard" element={<ProtectedBillingRoute><DISCTeamDashboard /></ProtectedBillingRoute>} />
                <Route path="/retencao/assessment-qa" element={<ProtectedBillingRoute><AssessmentQA /></ProtectedBillingRoute>} />
                <Route path="/retencao/assessment-qa/team-dashboard" element={<ProtectedBillingRoute><QATeamDashboard /></ProtectedBillingRoute>} />
                <Route path="/retencao/onboarding" element={<ProtectedBillingRoute><OnboardingHub /></ProtectedBillingRoute>} />
                <Route path="/retencao/onboarding/novo" element={<ProtectedBillingRoute><OnboardingWizard /></ProtectedBillingRoute>} />
                <Route path="/retencao/onboarding/:processId" element={<ProtectedBillingRoute><OnboardingDetail /></ProtectedBillingRoute>} />
                <Route path="/retencao/pulse" element={<ProtectedBillingRoute><PulseDaily /></ProtectedBillingRoute>} />
                <Route path="/retencao/pulse/daily" element={<ProtectedBillingRoute><PulseDaily /></ProtectedBillingRoute>} />
                <Route path="/retencao/pulse/hub" element={<ProtectedBillingRoute><PulseHub /></ProtectedBillingRoute>} />
                <Route path="/retencao/pulse/history" element={<ProtectedBillingRoute><PulseHistory /></ProtectedBillingRoute>} />
                <Route path="/retencao/pulse/surveys" element={<ProtectedBillingRoute><PulseSurveys /></ProtectedBillingRoute>} />
                <Route path="/retencao/pulse/admin" element={<ProtectedBillingRoute><PulseAdmin /></ProtectedBillingRoute>} />
                <Route path="/retencao/pulse/dashboard" element={<ProtectedBillingRoute><PulseDashboard /></ProtectedBillingRoute>} />
                <Route path="/retencao/pulse/leader" element={<ProtectedBillingRoute><PulseLeaderDashboard /></ProtectedBillingRoute>} />
                <Route path="/retencao/pulse/actions" element={<ProtectedBillingRoute><PulseActions /></ProtectedBillingRoute>} />
                <Route path="/retencao/pulse/cultura" element={<ProtectedBillingRoute><PulseCultureDashboard /></ProtectedBillingRoute>} />

                {/* Sistema de Evolução Routes */}
                <Route path="/retencao/evolucao" element={<ProtectedBillingRoute><EvolutionHub /></ProtectedBillingRoute>} />
                <Route path="/retencao/evolucao/novo" element={<ProtectedBillingRoute><EvolutionWizard /></ProtectedBillingRoute>} />
                <Route path="/retencao/evolucao/:cycleId" element={<ProtectedBillingRoute><EvolutionCycleDetail /></ProtectedBillingRoute>} />
                <Route path="/retencao/cargos-salarios" element={<ProtectedBillingRoute><CargosESalarios /></ProtectedBillingRoute>} />

                {/* Reuniões 1:1 Routes */}
                <Route path="/retencao/reunioes-1-1" element={<ProtectedBillingRoute><OneOnOneHub /></ProtectedBillingRoute>} />
                <Route path="/retencao/reunioes-1-1/nova" element={<ProtectedBillingRoute><OneOnOneNew /></ProtectedBillingRoute>} />
                <Route path="/retencao/reunioes-1-1/:meetingId" element={<ProtectedBillingRoute><OneOnOneMeeting /></ProtectedBillingRoute>} />

                {/* Offboarding Routes */}
                <Route path="/retencao/offboarding" element={<ProtectedBillingRoute><OffboardingHub /></ProtectedBillingRoute>} />
                <Route path="/retencao/offboarding/novo" element={<ProtectedBillingRoute><OffboardingNew /></ProtectedBillingRoute>} />
                <Route path="/retencao/offboarding/:caseId" element={<ProtectedBillingRoute><OffboardingDetail /></ProtectedBillingRoute>} />
                <Route path="/retencao/offboarding/dashboard" element={<ProtectedBillingRoute><OffboardingDashboard /></ProtectedBillingRoute>} />

                {/* Public Exit Survey Route */}
                <Route path="/offboarding/pesquisa/:token" element={<ExitSurveyPublic />} />

                {/* Educação Routes */}
                <Route path="/educacao" element={<ProtectedBillingRoute><EducacaoHub /></ProtectedBillingRoute>} />
                <Route path="/educacao/curso/:courseId" element={<ProtectedBillingRoute><CursoDetalhe /></ProtectedBillingRoute>} />

                {/* EP Partners Routes - Coming Soon */}
                <Route path="/ep-partners/sobre-nos" element={<ProtectedBillingRoute><ComingSoon pageName="Sobre Nós" /></ProtectedBillingRoute>} />
                <Route path="/ep-partners/nossas-solucoes" element={<ProtectedBillingRoute><ComingSoon pageName="Nossas Soluções" /></ProtectedBillingRoute>} />
                <Route path="/ep-partners/cursos-formacoes" element={<ProtectedBillingRoute><ComingSoon pageName="Cursos / Formações" /></ProtectedBillingRoute>} />

                {/* Sócio EP Routes */}
                <Route path="/socio/dashboard" element={<ProtectedRoute><ConsultantModeRouteBlock><SocioDashboard /></ConsultantModeRouteBlock></ProtectedRoute>} />
                <Route path="/socio/clientes" element={<ProtectedRoute><ConsultantModeRouteBlock><SocioClientes /></ConsultantModeRouteBlock></ProtectedRoute>} />
                <Route path="/socio/royalties" element={<ProtectedRoute><ConsultantModeRouteBlock><SocioRoyalties /></ConsultantModeRouteBlock></ProtectedRoute>} />
                <Route path="/socio/financeiro" element={<ProtectedRoute><ConsultantModeRouteBlock><SocioFinanceiro /></ConsultantModeRouteBlock></ProtectedRoute>} />
                <Route path="/socio/usuarios" element={<ProtectedRoute><ConsultantModeRouteBlock><SocioUsuarios /></ConsultantModeRouteBlock></ProtectedRoute>} />
                <Route path="/socio/projetos" element={<ProtectedRoute><ConsultantModeRouteBlock><SocioProjetosPage /></ConsultantModeRouteBlock></ProtectedRoute>} />

                {/* Account Routes - No billing gate for billing page */}
                <Route path="/conta/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
                <Route path="/conta/equipe" element={<ProtectedBillingRoute><Usuarios /></ProtectedBillingRoute>} />
                <Route path="/conta/usuarios" element={<Navigate to="/conta/equipe" replace />} />
                <Route path="/conta/permissoes" element={<Navigate to="/conta/equipe" replace />} />
                <Route path="/conta/notificacoes" element={<ProtectedBillingRoute><Notificacoes /></ProtectedBillingRoute>} />
                <Route path="/conta/comunicados" element={<ProtectedBillingRoute><Comunicados /></ProtectedBillingRoute>} />
                <Route path="/conta/comunicados/:id" element={<ProtectedBillingRoute><ComunicadoDetalhes /></ProtectedBillingRoute>} />
                <Route path="/conta/assinatura" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
                <Route path="/conta/billing" element={<Navigate to="/conta/assinatura" replace />} />
                <Route path="/conta/faturas" element={<ProtectedRoute><Faturas /></ProtectedRoute>} />

                {/* App Routes (Invites) */}
                <Route path="/app/accept-invite" element={<AcceptInvite />} />
                <Route path="/app/accept-ep-invite" element={<AcceptEPInvite />} />
                <Route path="/app/pending-approval" element={<PendingApproval />} />
                <Route path="/app/claim-grant" element={<ClaimGrant />} />
                <Route path="/app/access-requests" element={<ProtectedBillingRoute><AccessRequests /></ProtectedBillingRoute>} />

                {/* Admin Routes - No billing gate for admins */}
                <Route path="/admin/dashboard" element={<ProtectedRoute><ConsultantModeRouteBlock><AdminDashboard /></ConsultantModeRouteBlock></ProtectedRoute>} />
                <Route path="/admin/health" element={<ProtectedRoute><ConsultantModeRouteBlock><AccountHealth /></ConsultantModeRouteBlock></ProtectedRoute>} />
                <Route path="/admin/billing" element={<ProtectedRoute><ConsultantModeRouteBlock><AdminBilling /></ConsultantModeRouteBlock></ProtectedRoute>} />
                <Route path="/admin/llm-costs" element={<ProtectedRoute><ConsultantModeRouteBlock><AdminLlmCosts /></ConsultantModeRouteBlock></ProtectedRoute>} />
                <Route path="/admin/financial" element={<ProtectedRoute><ConsultantModeRouteBlock><AdminFinancialReport /></ConsultantModeRouteBlock></ProtectedRoute>} />
                <Route path="/admin/ai-billing-audit" element={<ProtectedRoute><ConsultantModeRouteBlock><AdminAIBillingAudit /></ConsultantModeRouteBlock></ProtectedRoute>} />
                <Route path="/admin/ai-billing-health" element={<ProtectedRoute><ConsultantModeRouteBlock><AdminAIBillingHealth /></ConsultantModeRouteBlock></ProtectedRoute>} />
                <Route path="/admin/voice-interview-simulator" element={<ProtectedRoute><ConsultantModeRouteBlock><AdminVoiceInterviewSimulator /></ConsultantModeRouteBlock></ProtectedRoute>} />
                <Route path="/admin/voice-interviews" element={<ProtectedRoute><ConsultantModeRouteBlock><AdminVoiceInterviewsMonitoring /></ConsultantModeRouteBlock></ProtectedRoute>} />
                <Route path="/admin/avaliacao-shadow" element={<ProtectedRoute><ConsultantModeRouteBlock><AdminShadowEvaluation /></ConsultantModeRouteBlock></ProtectedRoute>} />
                <Route path="/admin/company/:companyId" element={<ProtectedRoute><ConsultantModeRouteBlock><AdminCompanyView /></ConsultantModeRouteBlock></ProtectedRoute>} />
                <Route path="/admin/consultores" element={<ProtectedRoute><ConsultantModeRouteBlock><AdminConsultores /></ConsultantModeRouteBlock></ProtectedRoute>} />
                <Route path="/admin/grants" element={<ProtectedRoute><ConsultantModeRouteBlock><AdminGrants /></ConsultantModeRouteBlock></ProtectedRoute>} />
                <Route path="/admin/seat-grants" element={<ProtectedRoute><ConsultantModeRouteBlock><AdminSeatGrants /></ConsultantModeRouteBlock></ProtectedRoute>} />
                <Route path="/admin/pending-invites" element={<ProtectedRoute><ConsultantModeRouteBlock><AdminPendingInvites /></ConsultantModeRouteBlock></ProtectedRoute>} />
                <Route path="/admin/backup" element={<ProtectedRoute><ConsultantModeRouteBlock><BackupExport /></ConsultantModeRouteBlock></ProtectedRoute>} />
                <Route path="/admin/socios" element={<ProtectedRoute><ConsultantModeRouteBlock><AdminSocios /></ConsultantModeRouteBlock></ProtectedRoute>} />
                <Route path="/admin/royalties" element={<ProtectedRoute><ConsultantModeRouteBlock><AdminRoyalties /></ConsultantModeRouteBlock></ProtectedRoute>} />
                <Route path="/admin/suporte" element={<ProtectedRoute><ConsultantModeRouteBlock><SupportDashboard /></ConsultantModeRouteBlock></ProtectedRoute>} />
                <Route path="/admin/platform" element={<ProtectedRoute><ConsultantModeRouteBlock><PlatformSettings /></ConsultantModeRouteBlock></ProtectedRoute>} />
                <Route path="/admin/pricing" element={<ProtectedRoute><ConsultantModeRouteBlock><PricingAdmin /></ConsultantModeRouteBlock></ProtectedRoute>} />
                <Route path="/admin/credit-grants" element={<ProtectedRoute><ConsultantModeRouteBlock><CreditGrantsAdmin /></ConsultantModeRouteBlock></ProtectedRoute>} />
                <Route path="/admin/usuarios" element={<ProtectedRoute><ConsultantModeRouteBlock><AdminUsuarios /></ConsultantModeRouteBlock></ProtectedRoute>} />
                <Route path="/admin/candidates" element={<ProtectedRoute><ConsultantModeRouteBlock><AdminCandidatesOverview /></ConsultantModeRouteBlock></ProtectedRoute>} />
                <Route path="/admin/interview-debug/:sessionId" element={<ProtectedRoute><ConsultantModeRouteBlock><InterviewDebugPage /></ConsultantModeRouteBlock></ProtectedRoute>} />
                

                {/* Support Routes */}
                <Route path="/suporte/meus-chamados" element={<ProtectedBillingRoute><MyTickets /></ProtectedBillingRoute>} />
                <Route path="/suporte/chamado/:ticketId" element={<ProtectedBillingRoute><TicketDetail /></ProtectedBillingRoute>} />

                {/* Consultoria Hub Routes */}
                <Route path="/consultoria" element={<ProtectedRoute><ConsultoriaHub /></ProtectedRoute>} />
                <Route path="/consultoria/gestao" element={<ProtectedRoute><ConsultoriaGestao /></ProtectedRoute>} />
                <Route path="/consultoria/meus-projetos" element={<ProtectedRoute><ConsultoriaMeusProjetos /></ProtectedRoute>} />
                <Route path="/consultoria/equipe" element={<ProtectedRoute><ConsultoriaEquipe /></ProtectedRoute>} />
                <Route path="/consultoria/convites" element={<ProtectedRoute><ConsultoriaConvites /></ProtectedRoute>} />
                <Route path="/consultoria/playbooks" element={<ProtectedRoute><PlaybooksManagement /></ProtectedRoute>} />
                <Route path="/consultoria/time-tracking" element={<ProtectedRoute><TimeTracking /></ProtectedRoute>} />
                <Route path="/consultoria/analytics" element={<ProtectedRoute><PortfolioAnalytics /></ProtectedRoute>} />
                <Route path="/consultoria/projeto/:accountId" element={<ProtectedRoute><ClientProject /></ProtectedRoute>} />
                <Route path="/consultoria/suporte" element={<Navigate to="/admin/suporte" replace />} />
                <Route path="/consultoria/monitoramento" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/consultoria/propostas" element={<ProtectedRoute><PropostasComerciais /></ProtectedRoute>} />
                <Route path="/consultoria/avaliacoes" element={<ProtectedRoute><ConsultoriaAvaliacoes /></ProtectedRoute>} />
                <Route path="/avaliacao/:token" element={<SatisfactionSurvey />} />
                <Route path="/proposta/:token" element={<PropostaPublica />} />

                {/* Legacy Consultant Routes - Redirects */}
                <Route path="/consultor/dashboard" element={<Navigate to="/consultoria/meus-projetos" replace />} />
                <Route path="/consultor/head-dashboard" element={<Navigate to="/consultoria/gestao" replace />} />
                <Route path="/consultor/playbooks" element={<Navigate to="/consultoria/playbooks" replace />} />
                <Route path="/consultor/projeto/:accountId" element={<Navigate to="/consultoria/projeto/:accountId" replace />} />
                <Route path="/consultor/analytics" element={<Navigate to="/consultoria/analytics" replace />} />
                <Route path="/consultor/time-tracking" element={<Navigate to="/consultoria/time-tracking" replace />} />
                <Route path="/admin/consultores" element={<Navigate to="/consultoria/equipe" replace />} />
                <Route path="/admin/pending-invites" element={<Navigate to="/consultoria/convites" replace />} />

                {/* Client Portal (Cliente + EP Team) */}
                <Route path="/portal/projeto" element={<ProtectedRoute><ClientPortalProject /></ProtectedRoute>} />
                <Route path="/portal/projeto/:accountId" element={<ProtectedRoute><ClientPortalProject /></ProtectedRoute>} />

                {/* Public Client Portal (Recruitment Consultancy) */}
                <Route path="/portal/:token" element={<ClientPortalPage />} />

                {/* Public Shortlist Report */}
                <Route path="/relatorio/:token" element={<ShortlistReportViewer />} />

                {/* Public Market Research Report (white-label) */}
                <Route path="/pesquisa-mercado/:slug" element={<PublicMarketReportPage />} />

                {/* Public ROI Report */}
                <Route path="/report/:public_token" element={<ROIReportPage />} />

                {/* Employer Portal (account_type = employer) */}
                <Route path="/employer/jobs" element={<ProtectedEmployerRoute><EmployerJobsPage /></ProtectedEmployerRoute>} />
                <Route path="/employer/candidates" element={<ProtectedEmployerRoute><EmployerApprovedCandidatesPage /></ProtectedEmployerRoute>} />
                <Route path="/employer/reports" element={<ProtectedEmployerRoute><EmployerReportsPage /></ProtectedEmployerRoute>} />

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </SalesDemoProvider>
              </TooltipProvider>
              </CacheVersionCheck>
            </UserProvider>
          </ImpersonationProvider>
          </BillingProvider>
        </OrganizationProvider>
      </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
