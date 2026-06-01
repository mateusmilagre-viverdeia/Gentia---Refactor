import { cn } from "@/lib/utils";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useBadgeNotifications } from "@/hooks/useBadgeNotifications";
import { BadgeCelebration } from "@/components/gamification/BadgeCelebration";
import { HelpChatWidget } from "@/components/help/HelpChatWidget";
import { BillingBanner } from "@/components/billing/BillingBanner";
import { ImpersonationBanner } from "@/components/impersonation";
import { EPModeBanner } from "@/components/ep/EPModeBanner";
import { ConsultantModeBanner } from "@/components/consultor/ConsultantModeBanner";
import { DemoModeBadge } from "@/components/layout/DemoModeBadge";
import { LicensedRouteGuard } from "@/components/access/LicensedRouteGuard";


export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AppLayoutProps {
  fullWidth?: boolean;
  children: React.ReactNode;
  title: string;
  breadcrumb?: BreadcrumbItem[];
}

export function AppLayout({ children, title, breadcrumb, fullWidth }: AppLayoutProps) {
  // Activate badge notifications polling
  useBadgeNotifications();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full">
        <EPModeBanner />
          <ConsultantModeBanner />
        <ImpersonationBanner />
        <div className="flex flex-1 bg-background">
          <div data-sidebar="true" className="print:hidden">
            <AppSidebar />
          </div>
          <div className="flex-1 flex flex-col">
            <div data-topbar="true" className="print:hidden">
              <AppTopbar title={title} breadcrumb={breadcrumb} />
            </div>
            {/* Demo Mode Badge */}
            <DemoModeBadge />
            {/* Billing Banner */}
            <div className="print:hidden">
              <BillingBanner />
            </div>
            <main className="flex-1 p-6 print:p-0">
              <div className={cn(fullWidth ? "w-full" : "max-w-6xl mx-auto", "print:max-w-none")}>
                <LicensedRouteGuard>
                  {children}
                </LicensedRouteGuard>
              </div>
            </main>
          </div>
        </div>
      </div>
      
      {/* Global badge celebration modal */}
      <BadgeCelebration />
      
      {/* Global help chat widget */}
      <HelpChatWidget />

    </SidebarProvider>
  );
}
