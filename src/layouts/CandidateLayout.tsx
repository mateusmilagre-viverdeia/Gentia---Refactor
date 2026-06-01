import { useEffect, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export default function CandidateLayout() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isCandidate, setIsCandidate] = useState(false);

  useEffect(() => {
    const checkCandidateAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate("/");
        return;
      }

      // Check if user has candidate role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const hasCandidateRole = roles?.some(r => r.role === "candidate");

      // Check if user is a company member
      const { data: memberships } = await supabase
        .from("account_members")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("is_active", true);

      const isCompanyMember = memberships && memberships.length > 0;

      // If company member without candidate role, redirect to main app
      if (isCompanyMember && !hasCandidateRole) {
        navigate("/");
        return;
      }

      setIsCandidate(true);
      setLoading(false);
    };

    checkCandidateAccess();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="border-b border-border bg-background">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <main className="max-w-7xl mx-auto px-4 py-8">
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  if (!isCandidate) return null;

  return <Outlet />;
}
