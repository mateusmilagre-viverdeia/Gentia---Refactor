import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { PortalDashboard } from "@/components/portal/PortalDashboard";
import { PortalShortlistView } from "@/components/portal/PortalShortlistView";
import { Loader2, ShieldAlert } from "lucide-react";

type PortalView =
  | { type: "dashboard" }
  | { type: "shortlist"; jobId: string; jobTitle: string };

export default function ClientPortalPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { data: auth, isLoading, error } = usePortalAuth(token);
  const [view, setView] = useState<PortalView>({ type: "dashboard" });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Validando acesso...</p>
        </div>
      </div>
    );
  }

  if (error || !auth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold">Link inválido ou expirado</h1>
          <p className="text-muted-foreground leading-relaxed">
            {error || "Este link de acesso não é válido ou foi desativado. Verifique se copiou o link corretamente ou entre em contato com a consultoria responsável pelo seu processo."}
          </p>
          <div className="pt-2">
            <p className="text-xs text-muted-foreground">
              Se você recebeu este link recentemente e acredita que deveria funcionar, solicite um novo link de acesso ao seu consultor.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <PortalLayout auth={auth} onLogout={handleLogout}>
      {view.type === "dashboard" && (
        <PortalDashboard
          auth={auth}
          onViewShortlist={(jobId, jobTitle) => setView({ type: "shortlist", jobId, jobTitle })}
        />
      )}
      {view.type === "shortlist" && (
        <PortalShortlistView
          auth={auth}
          jobId={view.jobId}
          jobTitle={view.jobTitle}
          onBack={() => setView({ type: "dashboard" })}
        />
      )}
    </PortalLayout>
  );
}
