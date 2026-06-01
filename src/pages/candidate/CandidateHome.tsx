import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CandidateNavbar } from "@/components/candidate/CandidateNavbar";
import { useCandidateProfile } from "@/contexts/CandidateProfileContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Calendar, Sparkles, ChevronRight } from "lucide-react";
import { formatBRT } from "@/lib/datetime";


interface Application {
  id: string;
  status: string;
  applied_at: string;
  recruitment_jobs: {
    id: string;
    title: string;
    department: string | null;
    companies: {
      id: string;
      name: string;
      slug: string | null;
    } | null;
  } | null;
  matching_score?: number | null;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  applied: { label: "Candidatura Enviada", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  pending: { label: "Em Análise", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  reviewing: { label: "Em Análise", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  interview: { label: "Entrevista", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  offer: { label: "Proposta", className: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
  hired: { label: "Contratado", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  rejected: { label: "Não Selecionado", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  desqualificado: { label: "Desqualificado", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  withdrawn: { label: "Desistência", className: "bg-muted text-muted-foreground" },
};

export default function CandidateHome() {
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useCandidateProfile();
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate("/");
        return;
      }

      // Check if user is a candidate (has candidate role or is not a company member)
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const isCandidate = roles?.some(r => r.role === "candidate");
      
      // Check if user is a company member
      const { data: memberships } = await supabase
        .from("account_members")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("is_active", true);

      const isCompanyMember = memberships && memberships.length > 0;

      // If company member and not a candidate, redirect to main app
      if (isCompanyMember && !isCandidate) {
        navigate("/");
        return;
      }

      setUserId(session.user.id);
      setUserEmail(session.user.email || null);
      setAuthLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const { data: applications, isLoading: applicationsLoading } = useQuery({
    queryKey: ["candidate-applications", userId, profile?.id],
    queryFn: async () => {
      if (!userId || !profile?.id) return [];

      // Get candidate record using profile ID or email
      const { data: candidates } = await supabase
        .from("recruitment_candidates")
        .select("id")
        .eq("email", userEmail);

      if (!candidates || candidates.length === 0) return [];

      const candidateIds = candidates.map(c => c.id);

      const { data, error } = await supabase
        .from("recruitment_applications")
        .select(`
          id,
          status,
          applied_at,
          recruitment_jobs:job_id (
            id,
            title,
            department,
            companies:account_id (
              id,
              name,
              slug
            )
          )
        `)
        .in("candidate_id", candidateIds)
        .order("applied_at", { ascending: false });

      if (error) throw error;

      // Get matching scores from culture interviews
      const jobIds = data?.map(a => a.recruitment_jobs?.id).filter(Boolean) as string[];
      
      let matchingScores: Record<string, number> = {};
      if (jobIds.length > 0) {
        const { data: interviews } = await supabase
          .from("culture_interview_sessions")
          .select("job_id, matching_score")
          .eq("candidate_profile_id", profile.id)
          .in("job_id", jobIds)
          .eq("status", "completed");
        
        if (interviews) {
          interviews.forEach(i => {
            if (i.job_id && i.matching_score !== null) {
              matchingScores[i.job_id] = i.matching_score;
            }
          });
        }
      }

      // Merge matching scores into applications
      return data?.map(app => ({
        ...app,
        matching_score: app.recruitment_jobs?.id ? matchingScores[app.recruitment_jobs.id] : null
      })) as Application[];
    },
    enabled: !!userId && !!userEmail && !!profile?.id,
  });

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="border-b border-border bg-background">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <main className="max-w-7xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <CandidateNavbar user={{ email: userEmail || undefined, firstName: profile?.firstName, lastName: profile?.lastName }} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Minhas candidaturas</h1>

        {applicationsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : applications && applications.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {applications.map((app) => {
              const statusInfo = STATUS_CONFIG[app.status] || { label: app.status, className: "bg-muted text-muted-foreground" };
              const isDisqualified = app.status === "rejected" || app.status === "desqualificado";
              const job = app.recruitment_jobs;
              const company = job?.companies;
              const appliedDate = new Date(app.applied_at);

              return (
                <Card 
                  key={app.id} 
                  className="group overflow-hidden hover:shadow-lg transition-all cursor-pointer border-border/50 hover:border-primary/30"
                  onClick={() => job && navigate(`/candidato/aplicar/${job.id}`)}
                >
                  <CardContent className="p-0">
                    {/* Header with company info */}
                    <div className="p-4 border-b bg-muted/30">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-base truncate">
                              {job?.title || "Vaga"}
                            </h3>
                            {company?.name && (
                              <p className="text-sm text-muted-foreground truncate">
                                {company.name}
                              </p>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-3">
                      {/* Department if available */}
                      {job?.department && (
                        <p className="text-xs text-muted-foreground">
                          {job.department}
                        </p>
                      )}

                      {/* Status and Date row */}
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="secondary" className={`text-xs ${statusInfo.className}`}>
                          {statusInfo.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatBRT(appliedDate, "d MMM yyyy")}
                        </span>
                      </div>

                      {/* Matching score if available */}
                      {app.matching_score !== null && app.matching_score !== undefined && !isDisqualified && (
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">
                            Matching Cultural: {app.matching_score}%
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Nenhuma candidatura ainda</h2>
            <p className="text-muted-foreground">
              Suas candidaturas aparecerão aqui quando você se candidatar a vagas.
            </p>
          </Card>
        )}
      </main>
    </div>
  );
}
