import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Home,
  Users,
  Briefcase,
  Video,
  FileText,
  ChevronLeft,
  ChevronRight,
  Settings,
  BarChart3,
  Search,
  Store,
  Building2,
  DollarSign,
  Rocket,
  LineChart,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useOrganization } from "@/contexts/OrganizationContext";
import { CreditBalanceWidget, LowBalanceAlert } from "@/components/recruitment/credits";
import { useAgencyOnboarding } from "@/components/onboarding/agency/AgencyOnboardingWizardContext";
import { supabase } from "@/integrations/supabase/client";

type SidebarMode = "self" | "agency";

const generalItems = [
  { label: "Início", icon: Home, href: "/atracao-contratacao/recrutamento" },
  { label: "Vagas", icon: Briefcase, href: "/atracao-contratacao/recrutamento/jobs" },
  { label: "Candidatos", icon: Users, href: "/atracao-contratacao/recrutamento/candidates" },
  { label: "Aplicações", icon: FileText, href: "/atracao-contratacao/recrutamento/applications" },
  { label: "Entrevistas", icon: Video, href: "/atracao-contratacao/recrutamento/interviews" },
  { label: "Analytics", icon: BarChart3, href: "/atracao-contratacao/recrutamento/analytics" },
];

const agencyItems = [
  { label: "Clientes", icon: Building2, href: "/atracao-contratacao/recrutamento/clientes" },
  { label: "Financeiro", icon: DollarSign, href: "/atracao-contratacao/recrutamento/financeiro" },
  { label: "Hunting & Outreach", icon: Search, href: "/atracao-contratacao/recrutamento/hunting-outreach" },
  { label: "Talent Pool", icon: Store, href: "/atracao-contratacao/recrutamento/talent-pool" },
  { label: "Pesquisa de Mercado", icon: LineChart, href: "/atracao-contratacao/recrutamento/pesquisa-mercado" },
];

const modeKey = (accountId: string) => `recruitment_sidebar_mode:${accountId}`;
const collapsedKey = "recruitment_sidebar_collapsed";

export const RecruitmentSidebar = () => {
  const location = useLocation();
  const { currentOrganization } = useOrganization();
  const { openWizard } = useAgencyOnboarding();

  const accountId = currentOrganization?.id;
  const [mode, setMode] = useState<SidebarMode>("self");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(collapsedKey) === "1";
  });

  // Load company logo + refresh on org change
  useEffect(() => {
    if (!accountId) {
      setLogoUrl(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("companies")
        .select("logo_url")
        .eq("id", accountId)
        .maybeSingle();
      if (!cancelled) setLogoUrl(data?.logo_url ?? null);
    };
    load();
    const handler = () => load();
    window.addEventListener("company-logo-updated", handler);
    return () => {
      cancelled = true;
      window.removeEventListener("company-logo-updated", handler);
    };
  }, [accountId]);

  // Resolve initial mode: localStorage > clients heuristic
  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;

    (async () => {
      const stored = typeof window !== "undefined" ? localStorage.getItem(modeKey(accountId)) : null;
      if (stored === "self" || stored === "agency") {
        if (!cancelled) setMode(stored);
        return;
      }

      const { count } = await supabase
        .from("clientes_consultoria")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId);
      const nextMode: SidebarMode = (count ?? 0) > 0 ? "agency" : "self";
      if (!cancelled) setMode(nextMode);
    })();

    return () => {
      cancelled = true;
    };
  }, [accountId]);

  const handleModeChange = (next: string) => {
    if (next !== "self" && next !== "agency") return;
    setMode(next);
    if (accountId) {
      localStorage.setItem(modeKey(accountId), next);
      window.dispatchEvent(new CustomEvent("recruitment-mode-changed", { detail: { mode: next, accountId } }));
    }
  };

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem(collapsedKey, next ? "1" : "0");
      }
      return next;
    });
  };

  const isActive = (href: string) => {
    if (href === "/atracao-contratacao/recrutamento") {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  const renderItem = (item: { label: string; icon: typeof Home; href: string }) => {
    const link = (
      <Link
        to={item.href}
        className={cn(
          "flex items-center rounded-lg text-sm font-medium transition-colors",
          collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
          isActive(item.href)
            ? "bg-sidebar-active text-sidebar-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
        )}
        aria-label={item.label}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );

    if (!collapsed) {
      return <div key={item.href}>{link}</div>;
    }

    return (
      <Tooltip key={item.href}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  };

  const showAgency = mode === "agency";

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className={cn(
          "border-r border-border bg-sidebar-background flex flex-col h-full transition-[width] duration-200",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Header */}
        <div className={cn("border-b border-border", collapsed ? "p-2" : "p-4")}>
          <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0 overflow-hidden">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={currentOrganization?.name || "Logo"}
                  className="w-full h-full object-cover"
                  onError={() => setLogoUrl(null)}
                />
              ) : (
                <span className="text-primary-foreground font-bold text-lg">
                  {currentOrganization?.name?.charAt(0) || "R"}
                </span>
              )}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {currentOrganization?.name || "Recrutamento"}
                  </p>
                  <p className="text-xs text-muted-foreground">Módulo ATS</p>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={toggleCollapsed}
                      aria-label="Recolher menu"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Recolher menu</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>

          {/* Expand button when collapsed */}
          {collapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 mt-2 mx-auto flex"
                  onClick={toggleCollapsed}
                  aria-label="Expandir menu"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Expandir menu</TooltipContent>
            </Tooltip>
          )}

          {/* Mode toggle - hidden when collapsed */}
          {!collapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="mt-3">
                  <ToggleGroup
                    type="single"
                    value={mode}
                    onValueChange={(v) => v && handleModeChange(v)}
                    className="w-full grid grid-cols-2 gap-1 bg-sidebar-accent/40 p-1 rounded-md"
                  >
                    <ToggleGroupItem
                      value="self"
                      aria-label="Recrutamento próprio"
                      className="h-8 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm gap-1.5"
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      Próprio
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="agency"
                      aria-label="Operação de agência"
                      className="h-8 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm gap-1.5"
                    >
                      <Briefcase className="h-3.5 w-3.5" />
                      Agência
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Alterne entre uso interno de RH e operação de agência
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Navigation */}
        <nav className={cn("flex-1 overflow-y-auto", collapsed ? "p-2" : "p-3")}>
          {/* Geral */}
          <div className="space-y-1">
            {!collapsed && (
              <p className="px-3 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Geral
              </p>
            )}
            {generalItems.map(renderItem)}
          </div>

          {/* Operação de Agência */}
          {showAgency && (
            <div className="space-y-1 mt-4">
              {!collapsed && (
                <p className="px-3 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Operação de Agência
                </p>
              )}
              {agencyItems.map(renderItem)}
            </div>
          )}

          {/* Separator */}
          <div className="my-4 border-t border-border" />

          {/* Configuração inicial (reabre wizard) */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={openWizard}
                  className="w-full flex items-center justify-center px-0 py-2.5 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  aria-label="Configuração inicial"
                >
                  <Rocket className="h-5 w-5 shrink-0" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Configuração inicial</TooltipContent>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={openWizard}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <Rocket className="h-5 w-5 shrink-0" />
              <span>Configuração inicial</span>
            </button>
          )}

          {/* Saúde IA */}
          {renderItem({
            label: "Saúde IA",
            icon: ShieldAlert,
            href: "/atracao-contratacao/recrutamento/interview-health",
          })}

          {/* Settings */}
          {renderItem({
            label: "Configurações",
            icon: Settings,
            href: "/atracao-contratacao/recrutamento/configuracoes",
          })}
        </nav>

        {/* Footer */}
        <div className={cn("border-t border-border space-y-3", collapsed ? "p-2" : "p-3")}>
          {!collapsed && (
            <>
              <CreditBalanceWidget compact />
              <LowBalanceAlert threshold={10} compact />
            </>
          )}

          <div className="space-y-1">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-full text-muted-foreground"
                    asChild
                  >
                    <Link to="/atracao-contratacao" aria-label="Voltar ao Hub">
                      <ChevronLeft className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Voltar ao Hub</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-muted-foreground"
                asChild
              >
                <Link to="/atracao-contratacao">
                  <ChevronLeft className="h-4 w-4" />
                  Voltar ao Hub
                </Link>
              </Button>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
};
