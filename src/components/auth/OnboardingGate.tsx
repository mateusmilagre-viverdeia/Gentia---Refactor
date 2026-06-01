import { ReactNode } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CreateFirstOrganizationModal } from "./CreateFirstOrganizationModal";
import { Navigate } from "react-router-dom";

interface OnboardingGateProps {
  children: ReactNode;
}

export function OnboardingGate({ children }: OnboardingGateProps) {
  const { organizations, loading } = useOrganization();
  const { user, loading: authLoading } = useAuth();

  const shouldCheckRoles = !loading && !authLoading && !!user?.id && organizations.length === 0;

  const { data: isConsultant = false, isLoading: consultantLoading } = useQuery({
    queryKey: ["is-ep-consultant", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase.rpc("is_ep_consultant", {
        _user_id: user.id,
      });

      if (error) {
        console.error("Failed to check EP consultant role:", error);
        return false;
      }

      return data === true;
    },
    enabled: shouldCheckRoles,
    staleTime: 5 * 60 * 1000,
  });

  const { data: isCandidate = false, isLoading: candidateLoading } = useQuery({
    queryKey: ["is-candidate", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "candidate")
        .limit(1);

      if (error) {
        console.error("Failed to check candidate role:", error);
        return false;
      }

      return data && data.length > 0;
    },
    enabled: shouldCheckRoles,
    staleTime: 5 * 60 * 1000,
  });

  if (loading || authLoading || consultantLoading || candidateLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (organizations.length === 0 && isConsultant) {
    return <Navigate to="/consultoria" replace />;
  }

  if (organizations.length === 0 && isCandidate) {
    return <Navigate to="/candidate" replace />;
  }

  if (organizations.length === 0) {
    return <CreateFirstOrganizationModal />;
  }

  return <>{children}</>;
}

