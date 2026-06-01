import React from "react";
import { 
  Menu, 
  ChevronDown, 
  User, 
  Building2, 
  ClipboardList, 
  Users, 
  BookOpen, 
  GraduationCap, 
  BarChart3, 
  LayoutDashboard, 
  UserCog, 
  Briefcase, 
  LogOut, 
  Shield, 
  Newspaper, 
  HandCoins, 
  UserPlus, 
  Wallet, 
  FileBarChart, 
  UsersRound,
  CreditCard,
  Bell,
  Receipt,
  Armchair,
  Mail,
  ArrowLeft,
  Settings2,
  Activity,
  Sparkles,
  Coins
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useEPRole } from "@/hooks/useEPRole";
import { useAccount } from "@/hooks/useAccount";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { TopbarXPBadge } from "./TopbarXPBadge";
import { TopbarEducacaoButton } from "./TopbarEducacaoButton";
import { TopbarCreditsIndicator } from "./TopbarCreditsIndicator";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/theme";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { BreadcrumbItem as BreadcrumbItemType } from "./AppLayout";

interface AppTopbarProps {
  title: string;
  breadcrumb?: BreadcrumbItemType[];
}

export function AppTopbar({ title, breadcrumb }: AppTopbarProps) {
  const { user, setUser } = useUser();
  const navigate = useNavigate();
  const { isSuperAdmin } = useSuperAdmin();
  const { isEPTeam, isEPConsultant, isEPPartner, isHeadCS, isSuperAdmin: isSuperAdminEP } = useEPRole();
  const { isOwner } = useAccount();
  const { isConsultantMode, currentAccount } = useOrganization();

  const getInitials = () => {
    if (!user) return "?";
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  };

  const handleLogout = () => {
    setUser(null);
    navigate("/login");
  };

  return (
    <div className="h-14 border-b border-border/40 bg-background/95 backdrop-blur-sm flex items-center justify-between px-6 transition-colors duration-300" data-topbar="true">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="hover:bg-accent/50 rounded-lg p-2 transition-all duration-200"
          title="Voltar"
          aria-label="Voltar para página anterior"
        >
          <ArrowLeft className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        </button>
        
        <SidebarTrigger className="hover:bg-accent/50 rounded-lg p-2 transition-all duration-200">
          <Menu className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        </SidebarTrigger>
        
        <div>
          {breadcrumb && breadcrumb.length > 0 && (
            <Breadcrumb className="mb-0.5">
              <BreadcrumbList className="text-xs">
              {breadcrumb.map((item, index) => {
                  const isLast = index === breadcrumb.length - 1;
                  return (
                    <React.Fragment key={index}>
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage className="font-normal">{item.label}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink asChild>
                            <Link to={item.href || "#"} className="hover:text-foreground font-normal text-muted-foreground transition-colors duration-200">
                              {item.label}
                            </Link>
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                      {!isLast && <BreadcrumbSeparator />}
                    </React.Fragment>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>
          )}
          <h2 className="text-base font-medium tracking-tight text-foreground/90">{title}</h2>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <TopbarEducacaoButton />
        <TopbarXPBadge />
        <TopbarCreditsIndicator />
        <NotificationBell />
        <ThemeToggle />
        
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1.5 hover:opacity-80 transition-opacity ml-1">
            <div className="w-8 h-8 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center font-medium text-xs">
              {getInitials()}
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
          </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <div>
              <p className="font-medium">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Minha Conta */}
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal py-1">
              Minha Conta
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigate("/conta/perfil")} className="transition-colors duration-150">
              <User className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Meu Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/conta/notificacoes")} className="transition-colors duration-150">
              <Bell className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Notificações
            </DropdownMenuItem>
          </DropdownMenuGroup>
          
          <DropdownMenuSeparator />
          
          {/* Minha Empresa */}
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal py-1">
              Minha Empresa
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigate("/minha-empresa")} className="transition-colors duration-150">
              <Building2 className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Dados da Empresa
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/conta/equipe")} className="transition-colors duration-150">
              <Users className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Equipe & Permissões
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/conta/assinatura")} className="transition-colors duration-150">
              <CreditCard className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Assinatura & Faturas
            </DropdownMenuItem>
          </DropdownMenuGroup>
          
          <DropdownMenuSeparator />
          
          {/* Acesso Rápido */}
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal py-1">
              Acesso Rápido
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigate("/intranet")} className="transition-colors duration-150">
              <Newspaper className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Intranet
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/plano-de-acao")} className="transition-colors duration-150">
              <ClipboardList className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Plano de Ação
            </DropdownMenuItem>
          </DropdownMenuGroup>
          
          {/* EP Partners Info */}
          {!isConsultantMode && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <BookOpen className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  EP Partners
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => navigate("/ep-partners/sobre-nos")}>
                    <Users className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Sobre Nós
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/ep-partners/nossas-solucoes")}>
                    <BookOpen className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Nossas Soluções
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/ep-partners/cursos-formacoes")}>
                    <GraduationCap className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Cursos / Formações
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </>
          )}

          {/* Owner: Assumir Identidade */}
          {isOwner && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/conta/perfil#impersonation")}>
                <UserCog className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Assumir Identidade
              </DropdownMenuItem>
            </>
          )}

          {/* Painel de Sócio - Apenas para EP Partners */}
          {isEPPartner && !isConsultantMode && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Wallet className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  Painel de Sócio
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => navigate("/socio/dashboard")}>
                    <LayoutDashboard className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/socio/clientes")}>
                    <Building2 className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Meus Clientes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/socio/royalties")}>
                    <HandCoins className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Royalties
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/socio/financeiro")}>
                    <FileBarChart className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Financeiro
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/socio/usuarios")}>
                    <UsersRound className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Equipe
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </>
          )}

          {/* Consultoria EP - Apenas para time EP */}
          {isEPTeam && !isConsultantMode && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Briefcase className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  Consultoria EP
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {isEPConsultant && (
                    <DropdownMenuItem onClick={() => navigate("/consultor/dashboard")}>
                      <Briefcase className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      Meus Projetos
                    </DropdownMenuItem>
                  )}
                  {(isHeadCS || isSuperAdminEP) && (
                    <DropdownMenuItem onClick={() => navigate("/consultor/head-dashboard")}>
                      <LayoutDashboard className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      Dashboard Head
                    </DropdownMenuItem>
                  )}
                  {(isHeadCS || isSuperAdminEP || isEPPartner) && (
                    <DropdownMenuItem onClick={() => navigate("/admin/consultores")}>
                      <UserCog className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      Gestão Consultores
                    </DropdownMenuItem>
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </>
          )}

          {/* Administração - Apenas para super admins */}
          {isSuperAdmin && !isConsultantMode && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <BarChart3 className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  Administração
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => navigate("/admin/dashboard")}>
                    <BarChart3 className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Monitoramento
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin/health")}>
                    <Activity className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Saúde de Contas
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin/llm-costs")}>
                    <Sparkles className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Custos LLM
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin/financial")}>
                    <BarChart3 className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Relatório Financeiro
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin/ai-billing-audit")}>
                    <Shield className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Billing IA — Auditoria
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin/ai-billing-health")}>
                    <Shield className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Billing IA — Saúde (auto-estorno)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin/voice-interviews")}>
                    <Activity className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Entrevistas de Voz (Uso)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin/voice-interview-simulator")}>
                    <Sparkles className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Simulador Entrevista Voz
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin/usuarios")}>
                    <Users className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Usuários
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin/candidates")}>
                    <Users className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Candidatos (Global)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin/grants")}>
                    <Shield className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Liberações
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin/seat-grants")}>
                    <Armchair className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Assentos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin/credit-grants")}>
                    <Coins className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Créditos — Concessões
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin/pending-invites")}>
                    <Mail className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Convites Pendentes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin/socios")}>
                    <UserPlus className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Sócios EP
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin/royalties")}>
                    <HandCoins className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Royalties
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </>
          )}

          {/* Configurações da Plataforma — qualquer membro da conta EP Partners */}
          {!isConsultantMode && (isSuperAdmin || currentAccount?.id === '67f66f7a-d9a8-455e-8820-ee836cfe7401') && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/admin/platform")}>
                <Settings2 className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Configurações da Plataforma
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/admin/pricing")}>
                <Settings2 className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Pricing &amp; Créditos
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive transition-colors duration-150">
            <LogOut className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Sair
          </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
