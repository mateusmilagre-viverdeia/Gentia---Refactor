import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Briefcase, Users, FileText, LogOut, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/employer/jobs", icon: Briefcase, label: "Minhas Vagas" },
  { to: "/employer/candidates", icon: Users, label: "Candidatos Aprovados" },
  { to: "/employer/reports", icon: FileText, label: "Relatórios" },
];

export function EmployerLayout({ children }: { children: ReactNode }) {
  const { account } = useAccount();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const linkedClientId = (account as any)?.employer_linked_client_id;
  const linkedAgencyId = (account as any)?.employer_linked_agency_id;

  const { data: agency } = useQuery({
    queryKey: ["employer-agency-branding", linkedAgencyId],
    enabled: !!linkedAgencyId,
    queryFn: async () => {
      const { data: settings } = await supabase
        .from("consultancy_portal_settings")
        .select("consultancy_name, logo_url")
        .eq("account_id", linkedAgencyId)
        .maybeSingle();
      if (settings) return settings;
      const { data: company } = await supabase.from("companies").select("name").eq("id", linkedAgencyId).maybeSingle();
      return { consultancy_name: company?.name || "Consultoria parceira", logo_url: null };
    },
  });

  const { data: client } = useQuery({
    queryKey: ["employer-linked-client", linkedClientId],
    enabled: !!linkedClientId,
    queryFn: async () => {
      const { data } = await supabase
        .from("clientes_consultoria")
        .select("razao_social, nome_fantasia, logo_url")
        .eq("id", linkedClientId)
        .maybeSingle();
      return data;
    },
  });

  const handleLogout = async () => {
    await signOut();
    navigate("/auth/login");
  };

  const agencyName = agency?.consultancy_name || "Consultoria parceira";
  const clientName = client?.nome_fantasia || client?.razao_social || account?.name || "Empresa";

  const NavItems = ({ compact = false }: { compact?: boolean }) => (
    <>
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md text-sm transition-colors",
              compact ? "min-w-fit px-3 py-2" : "px-3 py-2",
              isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground",
            )
          }
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className={compact ? "whitespace-nowrap" : undefined}>{item.label}</span>
        </NavLink>
      ))}
    </>
  );

  if (!linkedClientId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-semibold">Conta sem cliente vinculado</h1>
          <p className="text-sm text-muted-foreground">
            Esta conta Employer ainda não está vinculada a um cliente ou consultoria. Entre em contato com a consultoria parceira.
          </p>
          <Button variant="outline" onClick={handleLogout}>Sair</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="hidden w-64 border-r bg-card md:flex md:flex-col">
        <div className="p-6 border-b space-y-3">
          {agency?.logo_url ? (
            <img src={agency.logo_url} alt={agencyName} className="h-10 w-auto" />
          ) : (
            <div className="text-lg font-bold">{agencyName}</div>
          )}
          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-[10px] uppercase text-muted-foreground">Empresa</p>
            <p className="truncate text-sm font-medium">{clientName}</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavItems />
        </nav>

        <div className="p-4 border-t space-y-2">
          <p className="flex items-center gap-2 text-xs text-muted-foreground"><Building2 className="h-3 w-3" /> Portal Employer</p>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start">
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur md:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{clientName}</p>
              <p className="truncate text-xs text-muted-foreground">Portal Employer · {agencyName}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-4 pb-3">
            <NavItems compact />
          </nav>
        </header>
        <main className="min-w-0 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
