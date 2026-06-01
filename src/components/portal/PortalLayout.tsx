import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PortalAuthData } from "@/hooks/usePortalAuth";
import { PortalNotificationBell } from "./PortalNotificationBell";

interface PortalLayoutProps {
  auth: PortalAuthData;
  children: React.ReactNode;
  onLogout?: () => void;
}

export function PortalLayout({ auth, children, onLogout }: PortalLayoutProps) {
  const displayName = auth.client.nome_fantasia || auth.client.razao_social;

  // Fetch consultancy branding
  const { data: consultancy } = useQuery({
    queryKey: ["consultancy-portal-settings", auth.accountId],
    queryFn: async () => {
      const { data } = await supabase
        .from("consultancy_portal_settings")
        .select("consultancy_name, logo_url")
        .eq("account_id", auth.accountId)
        .maybeSingle();
      return data;
    },
  });

  const consultancyLogo = consultancy?.logo_url;
  const consultancyName = consultancy?.consultancy_name;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {consultancyLogo ? (
              <img
                src={consultancyLogo}
                alt={consultancyName || "Consultoria"}
                className="h-8 w-8 rounded object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                {(consultancyName || displayName).charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-sm font-semibold">{displayName}</h1>
              {auth.contact && (
                <p className="text-xs text-muted-foreground">{auth.contact.nome}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <PortalNotificationBell token={auth.access.token_acesso} />
            <Button variant="ghost" size="sm" onClick={onLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
