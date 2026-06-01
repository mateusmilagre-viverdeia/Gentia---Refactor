import { Brain, Lightbulb, Target, UserCheck, Lock } from "lucide-react";
import { useTheme } from "next-themes";
import logoGentia from "@/assets/logo-gentia-black.png";
import logoGentiaWhite from "@/assets/logo-gentia-white.png";
import { SidebarProgressRing } from "./SidebarProgressRing";
import { SidebarNavItemWithProgress } from "./SidebarNavItemWithProgress";
import { OrganizationSwitcher } from "./OrganizationSwitcher";
import { EPOrganizationSwitcher } from "@/components/ep/EPOrganizationSwitcher";
import { useLicensedAccess } from "@/hooks/useLicensedAccess";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Jornadas com progresso - barras em preto minimalista
const journeyNavigationItems = [
  { 
    title: "Onboarding", 
    url: "/diagnostico", 
    icon: Brain, 
    journeyId: "diagnostico",
    colorClass: "text-violet-500",
    bgColorClass: "bg-violet-500",
  },
  { 
    title: "Cultura", 
    url: "/cultura", 
    icon: Lightbulb, 
    journeyId: "cultura",
    colorClass: "text-amber-500",
    bgColorClass: "bg-amber-500",
  },
  { 
    title: "Atração e Contratação", 
    url: "/atracao-contratacao", 
    icon: Target, 
    journeyId: "atracao",
    colorClass: "text-emerald-500",
    bgColorClass: "bg-emerald-500",
  },
  { 
    title: "Retenção", 
    url: "/retencao", 
    icon: UserCheck, 
    journeyId: "retencao",
    colorClass: "text-sky-500",
    bgColorClass: "bg-sky-500",
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { resolvedTheme } = useTheme();
  const isCollapsed = state === "collapsed";
  const { isJourneyDisabled, isJourneyViewOnly, getJourneyAccessLevel } = useLicensedAccess();
  
  const currentLogo = resolvedTheme === 'dark' ? logoGentiaWhite : logoGentia;

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40" data-sidebar="true">
      <SidebarContent>
        {/* Logo */}
        <div className={`border-b border-border/40 overflow-hidden ${isCollapsed ? 'p-2' : resolvedTheme === 'dark' ? 'h-16 px-4 py-0 flex items-center justify-center' : 'py-3 px-4'}`}>
          <img 
            src={currentLogo} 
            alt="Gent.IA" 
            className={`w-auto mx-auto object-contain ${resolvedTheme === 'dark' ? 'h-full scale-[2.1] origin-center' : 'h-[17px]'}`}
          />
        </div>

        {/* Organization Switcher */}
        <OrganizationSwitcher />

        {/* EP Organization Switcher - Only visible for EP team */}
        <EPOrganizationSwitcher />

        {/* Progress Ring */}
        <SidebarProgressRing />
        

        {/* Journey Navigation with Progress */}
        <SidebarGroup className="px-2 py-2 border-t border-border/40">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {journeyNavigationItems.map((item) => {
                const isDisabled = isJourneyDisabled(item.journeyId);
                const isViewOnly = isJourneyViewOnly(item.journeyId);
                const accessLevel = getJourneyAccessLevel(item.journeyId);

                if (isDisabled) {
                  // Show disabled state
                  return (
                    <SidebarMenuItem key={item.title}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="relative flex items-center gap-3 px-4 py-3 opacity-40 cursor-not-allowed">
                            <Lock className="h-5 w-5 text-muted-foreground" />
                            {!isCollapsed && (
                              <span className="font-medium text-sm text-muted-foreground">{item.title}</span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <span>Este módulo não está disponível no seu plano</span>
                        </TooltipContent>
                      </Tooltip>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="p-0 h-auto">
                      <SidebarNavItemWithProgress
                        title={item.title}
                        url={item.url}
                        icon={item.icon}
                        journeyId={item.journeyId}
                        colorClass={item.colorClass}
                        bgColorClass={item.bgColorClass}
                        isViewOnly={isViewOnly}
                        hideProgress={false}
                      />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}