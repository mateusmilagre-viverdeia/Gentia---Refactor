import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  User, 
  Bell, 
  Building2, 
  Users, 
  CreditCard,
  Home
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "Minha Conta",
    items: [
      { label: "Meu Perfil", href: "/conta/perfil", icon: User },
      { label: "Notificações", href: "/conta/notificacoes", icon: Bell },
    ],
  },
  {
    title: "Minha Empresa",
    items: [
      { label: "Dados da Empresa", href: "/minha-empresa", icon: Building2 },
      { label: "Equipe & Permissões", href: "/conta/equipe", icon: Users },
      { label: "Assinatura & Faturas", href: "/conta/assinatura", icon: CreditCard },
    ],
  },
];

export function SettingsSidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 border-r border-border bg-card min-h-screen p-6">
      <nav className="space-y-6">
        {/* Link para voltar ao Dashboard */}
        <NavLink
          to="/"
          className="flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <Home className="h-4 w-4" />
          Início
        </NavLink>
        
        <div className="border-t border-border" />
        
        {navGroups.map((group) => (
          <div key={group.title}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {group.title}
            </h3>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.href}>
                    <NavLink
                      to={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
