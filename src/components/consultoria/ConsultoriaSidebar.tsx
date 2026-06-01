import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  FolderOpen, 
  Users, 
  Clock, 
  BookOpen, 
  BarChart3, 
  Mail, 
  Headphones, 
  Eye,
  Star,
  ChevronLeft,
  Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEPRole } from "@/hooks/useEPRole";

interface MenuItem {
  label: string;
  icon: React.ElementType;
  href: string;
  roles: ('super_admin' | 'head_cs' | 'ep_consultant' | 'ep_partner')[];
}

const mainMenuItems: MenuItem[] = [
  { label: "Dashboard Gestão", icon: LayoutDashboard, href: "/consultoria/gestao", roles: ['super_admin', 'head_cs'] },
  { label: "Meus Projetos", icon: FolderOpen, href: "/consultoria/meus-projetos", roles: ['super_admin', 'head_cs', 'ep_consultant'] },
  { label: "Equipe EP", icon: Users, href: "/consultoria/equipe", roles: ['super_admin', 'head_cs', 'ep_partner'] },
  { label: "Time Tracking", icon: Clock, href: "/consultoria/time-tracking", roles: ['super_admin', 'head_cs', 'ep_consultant'] },
  { label: "Playbooks", icon: BookOpen, href: "/consultoria/playbooks", roles: ['super_admin', 'head_cs'] },
  { label: "Analytics", icon: BarChart3, href: "/consultoria/analytics", roles: ['super_admin', 'head_cs', 'ep_consultant'] },
  { label: "Avaliação de Consultores", icon: Star, href: "/consultoria/avaliacoes", roles: ['super_admin', 'head_cs'] },
];

const adminMenuItems: MenuItem[] = [
  { label: "Convites Pendentes", icon: Mail, href: "/consultoria/convites", roles: ['super_admin', 'head_cs'] },
  { label: "Central de Suporte", icon: Headphones, href: "/consultoria/suporte", roles: ['super_admin', 'head_cs'] },
  { label: "Monitoramento", icon: Eye, href: "/consultoria/monitoramento", roles: ['super_admin'] },
];

export const ConsultoriaSidebar = () => {
  const location = useLocation();
  const { isSuperAdmin, isHeadCS, isEPConsultant, isEPPartner } = useEPRole();

  const getUserRoles = (): ('super_admin' | 'head_cs' | 'ep_consultant' | 'ep_partner')[] => {
    const roles: ('super_admin' | 'head_cs' | 'ep_consultant' | 'ep_partner')[] = [];
    if (isSuperAdmin) roles.push('super_admin');
    if (isHeadCS) roles.push('head_cs');
    if (isEPConsultant) roles.push('ep_consultant');
    if (isEPPartner) roles.push('ep_partner');
    return roles;
  };

  const userRoles = getUserRoles();

  const canSeeItem = (item: MenuItem) => {
    return item.roles.some(role => userRoles.includes(role));
  };

  const isActive = (href: string) => {
    if (href === "/consultoria/gestao") {
      return location.pathname === href || location.pathname.startsWith("/consultoria/gestao/");
    }
    return location.pathname === href || location.pathname.startsWith(href + "/");
  };

  const visibleMainItems = mainMenuItems.filter(canSeeItem);
  const visibleAdminItems = adminMenuItems.filter(canSeeItem);

  return (
    <aside className="w-64 border-r border-border bg-sidebar-background flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Briefcase className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">Consultoria EP</p>
            <p className="text-xs text-muted-foreground">Gestão de Projetos</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visibleMainItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              isActive(item.href)
                ? "bg-sidebar-active text-sidebar-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span>{item.label}</span>
          </Link>
        ))}

        {/* Admin Section */}
        {visibleAdminItems.length > 0 && (
          <>
            <div className="my-4 border-t border-border" />
            <p className="px-3 py-1 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
              Administração
            </p>
            {visibleAdminItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-sidebar-active text-sidebar-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Footer - Back to Hub */}
      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground"
          asChild
        >
          <Link to="/consultoria">
            <ChevronLeft className="h-4 w-4" />
            Hub de Consultoria
          </Link>
        </Button>
      </div>
    </aside>
  );
};
