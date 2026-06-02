import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { useReprocessCultureEvaluation } from "@/hooks/useReprocessCultureEvaluation";
import { useRetranscribeCultureInterview } from "@/hooks/useRetranscribeCultureInterview";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSignedFileUrl } from "@/lib/storageUrl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "./StatusBadge";
import { CandidateActivityTimeline } from "./CandidateActivityTimeline";
import { AddNoteDialog } from "./AddNoteDialog";
import { EvaluationDialog } from "./scorecards/EvaluationDialog";
import {
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Calendar,
  Briefcase,
  GraduationCap,
  FileText,
  ExternalLink,
  User,
  Building2,
  Target,
  Clock,
  StickyNote,
  ClipboardList,
  MessageSquareText,
} from "lucide-react";

import { CandidateCommunicationsSection } from "@/components/recruitment/CandidateCommunicationsSection";
import { CandidateNpsCard } from "@/components/recruitment/CandidateNpsCard";
import { ResetStepDialog } from "@/components/recruitment/ResetStepDialog";
import { GenerateTestLinkDialog } from "@/components/recruitment/GenerateTestLinkDialog";
import { RotateCcw, RefreshCw, Link2 } from "lucide-react";
import { useAccount } from "@/hooks/useAccount";
import { useEPRole } from "@/hooks/useEPRole";
import { useOrganization } from "@/contexts/OrganizationContext";
import { formatBRT } from "@/lib/datetime";

interface CandidateDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string | null;
  candidateData?: {
    name: string;
    email: string;
    phone: string;
    city: string;
    stage: string;
    jobTitles: string[];
    avatar: string;
    linkedinUrl?: string;
    matchingScore?: number | null;
    appliedAt?: string;
  };
}

export function CandidateDetailsModal({
  open,
  onOpenChange,
  candidateId,
  candidateData,
}: CandidateDetailsModalProps) {
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [evaluationDialogOpen, setEvaluationDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [testLinkDialogOpen, setTestLinkDialogOpen] = useState(false);
  const [testLinkTarget, setTestLinkTarget] = useState<{ jobId: string } | null>(null);
  const [resetTarget, setResetTarget] = useState<{ appId: string; jobId: string } | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<{
    id: string;
    stage: string;
    jobTitle: string;
  } | null>(null);
  const { isAdminRH } = useAccount();
  const { isSuperAdmin, isEPConsultant } = useEPRole();
  const canManageRecruitment = isAdminRH || isSuperAdmin || isEPConsultant;
  const { currentAccount } = useOrganization();
  const reprocessMutation = useReprocessCultureEvaluation();
  const retranscribeMutation = useRetranscribeCultureInterview();

  const handleOpenEvaluation = (app: any) => {
    setSelectedApplication({
      id: app.id,
      stage: app.status || "screening",
      jobTitle: app.recruitment_jobs?.title || "Candidatura"
    });
    setEvaluationDialogOpen(true);
  };
  // Fetch detailed candidate data
  const { data: profileDetails, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["candidate-details-modal", candidateId],
    queryFn: async () => {
      if (!candidateId) return null;

      // Try to fetch from candidate_profiles first
      const { data: profile } = await supabase
        .from("candidate_profiles")
        .select("*")
        .eq("id", candidateId)
        .maybeSingle();

      if (profile) {
        // Get email from profiles table
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", profile.user_id)
          .maybeSingle();

        return {
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          full_name: profile.full_name,
          email: userProfile?.email || null,
          phone: profile.phone,
          linkedin_url: profile.linkedin_url,
          avatar_url: profile.avatar_url,
          cv_url: profile.cv_url,
          created_at: profile.created_at,
          city: profile.city,
          birth_date: profile.birth_date,
          gender: profile.gender,
          source: "candidate_profiles" as const,
        };
      }

      // If not found, try recruitment_candidates
      const { data: recruitmentCandidate } = await supabase
        .from("recruitment_candidates")
        .select("*")
        .eq("id", candidateId)
        .maybeSingle();

      if (recruitmentCandidate) {
        return {
          id: recruitmentCandidate.id,
          first_name: recruitmentCandidate.first_name,
          last_name: recruitmentCandidate.last_name,
          full_name: `${recruitmentCandidate.first_name || ""} ${recruitmentCandidate.last_name || ""}`.trim(),
          email: recruitmentCandidate.email,
          phone: recruitmentCandidate.phone,
          linkedin_url: recruitmentCandidate.linkedin_url,
          avatar_url: recruitmentCandidate.avatar_url,
          cv_url: null as string | null,
          created_at: recruitmentCandidate.created_at,
          city: null as string | null,
          birth_date: null as string | null,
          gender: null as string | null,
          source: "recruitment_candidates" as const,
        };
      }

      return null;
    },
    enabled: !!candidateId && open,
  });

  // Fetch work history
  const { data: workHistory = [], isLoading: isLoadingWork } = useQuery({
    queryKey: ["candidate-work-history-modal", candidateId],
    queryFn: async () => {
      if (!candidateId) return [];
      const { data } = await supabase
        .from("candidate_work_history")
        .select("*")
        .eq("candidate_profile_id", candidateId)
        .order("start_date", { ascending: false });

      return data || [];
    },
    enabled: !!candidateId && open,
  });

  // Fetch education
  const { data: education = [], isLoading: isLoadingEducation } = useQuery({
    queryKey: ["candidate-education-modal", candidateId],
    queryFn: async () => {
      if (!candidateId) return [];
      const { data } = await supabase
        .from("candidate_education")
        .select("*")
        .eq("candidate_profile_id", candidateId)
        .order("created_at", { ascending: false });

      return data || [];
    },
    enabled: !!candidateId && open,
  });

  // Fetch interview sessions (culture fit)
  const { data: interviews = [] } = useQuery({
    queryKey: ["candidate-interviews-modal", candidateId],
    queryFn: async () => {
      if (!candidateId) return [];
      const { data } = await supabase
        .from("culture_interview_sessions")
        .select(`
          id,
          status,
          matching_score,
          matching_analysis,
          evaluation_audit_trail,
          is_test,
          audio_storage_path,
          created_at,
          completed_at,
          job_id,
          recruitment_jobs (
            title
          )
        `)
        .eq("candidate_profile_id", candidateId)
        .order("created_at", { ascending: false });

      return data || [];
    },
    enabled: !!candidateId && open,
  });

  // Fetch applications
  const { data: applications = [] } = useQuery({
    queryKey: ["candidate-applications-modal", candidateId],
    queryFn: async () => {
      if (!candidateId) return [];
      const { data } = await supabase
        .from("recruitment_applications")
        .select(`
          id,
          status,
          applied_at,
          job_id,
          recruitment_jobs (
            title
          )
        `)
        .eq("candidate_id", candidateId)
        .order("applied_at", { ascending: false });

      return data || [];
    },
    enabled: !!candidateId && open,
  });

  const isLoading = isLoadingProfile;

  const profile = profileDetails;
  const displayName = candidateData?.name || profile?.full_name || `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || "Candidato";
  const email = candidateData?.email || profile?.email || "";
  const phone = candidateData?.phone || profile?.phone || "";
  const city = candidateData?.city || profile?.city || "";
  // candidate-files é privado: path -> signed URL; URL externa passa direto (compat no helper).
  const avatar = useSignedFileUrl("candidate-files", candidateData?.avatar || profile?.avatar_url) ?? undefined;
  const linkedinUrl = candidateData?.linkedinUrl || profile?.linkedin_url || "";
  const cvUrl = useSignedFileUrl("candidate-files", profile?.cv_url) ?? "";

  const formatDate = (date: string | null) => {
    if (!date) return "";
    try {
      return formatBRT(new Date(date), "dd MMM yyyy");
    } catch {
      return date;
    }
  };

  const formatMonthYear = (date: string | null) => {
    if (!date) return "";
    try {
      return formatBRT(new Date(date), "MMM yyyy");
    } catch {
      return date;
    }
  };

  const getInitials = () => {
    if (!displayName || displayName === "Candidato") return "C";
    const parts = displayName.split(" ").filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="sr-only">Perfil do Candidato</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-60px)]">
          <div className="p-6 pt-2 space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-20 w-20 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <Skeleton className="h-32 w-full" />
              </div>
            ) : (
              <>
                {/* Header with avatar and basic info */}
                <div className="flex items-start gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={avatar} />
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold truncate">{displayName}</h2>
                    
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {candidateData?.stage && (
                        <StatusBadge status={candidateData.stage} />
                      )}
                      {candidateData?.matchingScore && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <Target className="h-3 w-3 mr-1" />
                          {candidateData.matchingScore}% match
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                      {email && (
                        <a href={`mailto:${email}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                          <Mail className="h-4 w-4" />
                          <span className="truncate max-w-[200px]">{email}</span>
                        </a>
                      )}
                      {phone && (
                        <a href={`tel:${phone}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                          <Phone className="h-4 w-4" />
                          {phone}
                        </a>
                      )}
                      {city && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" />
                          {city}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setNoteDialogOpen(true)}
                  >
                    <StickyNote className="h-4 w-4 mr-2" />
                    Adicionar Nota
                  </Button>
                  {linkedinUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={linkedinUrl} target="_blank" rel="noopener noreferrer">
                        <Linkedin className="h-4 w-4 mr-2" />
                        LinkedIn
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  )}
                  {cvUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={cvUrl} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-4 w-4 mr-2" />
                        Ver Currículo
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  )}
                </div>

                {/* Note Dialog */}
                <AddNoteDialog
                  open={noteDialogOpen}
                  onOpenChange={setNoteDialogOpen}
                  candidateId={candidateId || ""}
                  candidateName={displayName}
                />

                {/* Applied jobs */}
                {candidateData?.jobTitles && candidateData.jobTitles.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Vagas Aplicadas
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {candidateData.jobTitles.map((job, idx) => (
                          <Badge key={idx} variant="outline">
                            {job}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Applications section */}
                {applications.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Candidaturas ({applications.length})
                      </h3>
                      <div className="space-y-2">
                        {applications.map((app: any) => (
                          <div key={app.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <div>
                              <p className="font-medium text-sm">
                                {app.recruitment_jobs?.title || "Vaga não encontrada"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Aplicou em {formatDate(app.applied_at)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {canManageRecruitment && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setResetTarget({ appId: app.id, jobId: app.job_id });
                                    setResetDialogOpen(true);
                                  }}
                                  className="h-7 px-2 text-muted-foreground hover:text-foreground"
                                >
                                  <RotateCcw className="h-4 w-4 mr-1" />
                                  Resetar
                                </Button>
                              )}
                              {canManageRecruitment && currentAccount && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setTestLinkTarget({ jobId: app.job_id });
                                    setTestLinkDialogOpen(true);
                                  }}
                                  className="h-7 px-2 text-muted-foreground hover:text-foreground"
                                >
                                  <Link2 className="h-4 w-4 mr-1" />
                                  Link de Teste
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleOpenEvaluation(app)}
                                className="h-7 px-2"
                              >
                                <ClipboardList className="h-4 w-4 mr-1" />
                                Avaliar
                              </Button>
                              <StatusBadge status={app.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Culture fit interviews */}
                {interviews.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Entrevistas de Fit Cultural ({interviews.length})
                      </h3>
                      <div className="space-y-2">
                        {interviews.map((interview: any) => (
                          <div key={interview.id} className="p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">
                                  {interview.recruitment_jobs?.title || "Vaga não encontrada"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(interview.created_at)}
                                  {interview.completed_at && ` • Concluído em ${formatDate(interview.completed_at)}`}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {isAdminRH && interview.status === 'completed' && (interview.matching_score === 0 || interview.matching_score === null) && interview.audio_storage_path && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    disabled={retranscribeMutation.isPending}
                                    onClick={() => retranscribeMutation.mutate(interview.id)}
                                  >
                                    <RefreshCw className={`h-3 w-3 mr-1 ${retranscribeMutation.isPending ? 'animate-spin' : ''}`} />
                                    Retranscrever e Reavaliar
                                  </Button>
                                )}
                                {isAdminRH && interview.status === 'completed' && (interview.matching_score === 0 || interview.matching_score === null) && !interview.audio_storage_path && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    disabled={reprocessMutation.isPending}
                                    onClick={() => reprocessMutation.mutate(interview.id)}
                                  >
                                    <RefreshCw className={`h-3 w-3 mr-1 ${reprocessMutation.isPending ? 'animate-spin' : ''}`} />
                                    Reavaliar
                                  </Button>
                                )}
                                {interview.matching_score != null && interview.matching_score > 0 && (
                                  <div className="flex items-center gap-2">
                                    {(interview.is_test || interview.evaluation_audit_trail?.version === 'v3') && (
                                      <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-purple-50 text-purple-600 border-purple-100">
                                        V3
                                      </Badge>
                                    )}
                                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                      {interview.matching_score}%
                                    </Badge>
                                  </div>
                                )}
                                {interview.matching_score === 0 && (
                                  <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                    0% ⚠️
                                  </Badge>
                                )}
                                <StatusBadge status={interview.status} />
                              </div>
                            </div>
                            {interview.matching_analysis && (
                              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                {interview.matching_analysis}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Work history */}
                {isLoadingWork ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : workHistory.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Experiência Profissional
                      </h3>
                      <div className="space-y-3">
                        {workHistory.map((job: any) => (
                          <div key={job.id} className="relative pl-4 border-l-2 border-muted">
                            <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-primary" />
                            <p className="font-medium text-sm">{job.position}</p>
                            <p className="text-sm text-muted-foreground">{job.company}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatMonthYear(job.start_date)} - {job.is_current ? "Atual" : formatMonthYear(job.end_date)}
                            </p>
                            {job.responsibilities && (
                              <p className="text-xs text-muted-foreground mt-1">{job.responsibilities}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Education */}
                {isLoadingEducation ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : education.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        Formação Acadêmica
                      </h3>
                      <div className="space-y-2">
                        {education.map((edu: any) => (
                          <div key={edu.id} className="p-3 rounded-lg bg-muted/50">
                            <p className="font-medium text-sm">{edu.course_name}</p>
                            <p className="text-xs text-muted-foreground">{edu.degree_type}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Additional info */}
                {(profile?.birth_date || profile?.gender || candidateData?.appliedAt) && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Informações Adicionais
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {profile?.birth_date && (
                          <div>
                            <p className="text-muted-foreground">Data de Nascimento</p>
                            <p className="font-medium">{formatDate(profile.birth_date)}</p>
                          </div>
                        )}
                        {profile?.gender && (
                          <div>
                            <p className="text-muted-foreground">Gênero</p>
                            <p className="font-medium capitalize">{profile.gender}</p>
                          </div>
                        )}
                        {candidateData?.appliedAt && (
                          <div>
                            <p className="text-muted-foreground">Primeira Aplicação</p>
                            <p className="font-medium">{formatDate(candidateData.appliedAt)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Activity Timeline */}
                <Separator />
                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Histórico de Atividades
                  </h3>
                  <CandidateActivityTimeline candidateId={candidateId} maxItems={5} />
                </div>

                {/* NPS Feedback */}
                {candidateId && (
                  <>
                    <Separator />
                    <CandidateNpsCard candidateId={candidateId} />
                  </>
                )}


                <Separator />
                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <MessageSquareText className="h-4 w-4" />
                    Comunicações
                  </h3>
                  {candidateId ? (
                    <CandidateCommunicationsSection
                      candidateId={candidateId}
                      candidateLabel={displayName}
                      applications={applications as any}
                    />
                  ) : null}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Evaluation Dialog */}
        {selectedApplication && (
          <EvaluationDialog
            open={evaluationDialogOpen}
            onOpenChange={setEvaluationDialogOpen}
            applicationId={selectedApplication.id}
            candidateName={`${displayName} - ${selectedApplication.jobTitle}`}
            currentStage={selectedApplication.stage}
          />
        )}

        {/* Reset Step Dialog */}
        {resetTarget && candidateId && (
          <ResetStepDialog
            open={resetDialogOpen}
            onOpenChange={setResetDialogOpen}
            candidateId={candidateId}
            candidateName={displayName}
            jobId={resetTarget.jobId}
            applicationId={resetTarget.appId}
          />
        )}

        {/* Generate Test Link Dialog */}
        {testLinkTarget && candidateId && currentAccount && (
          <GenerateTestLinkDialog
            open={testLinkDialogOpen}
            onOpenChange={setTestLinkDialogOpen}
            candidateId={candidateId}
            candidateName={displayName}
            jobId={testLinkTarget.jobId}
            accountId={currentAccount.id}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
