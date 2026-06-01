import { useState, useMemo, useEffect } from "react";
import { calculateCompositeScore, getCompositeScoreBadgeVariant } from "@/lib/compositeScore";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useRecruitmentActions } from "@/hooks/useRecruitmentActions";
import { useTableSort } from "@/hooks/useTableSort";
import { RecruitmentLayout } from "@/components/layout/RecruitmentLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/recruitment/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateCandidateDialog } from "@/components/recruitment/CreateCandidateDialog";
import { EditCandidateDialog } from "@/components/recruitment/EditCandidateDialog";
import { HireCandidateDialog } from "@/components/recruitment/HireCandidateDialog";
import { CandidateDetailsModal } from "@/components/recruitment/CandidateDetailsModal";
import { ResetStepDialog } from "@/components/recruitment/ResetStepDialog";
import { SortableHeader } from "@/components/ui/sortable-header";
import { CandidateFilters, INITIAL_FILTERS, type CandidateFiltersState } from "@/components/recruitment/filters";
import { TagBadge, CandidateTagManager } from "@/components/recruitment/tags";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, MoreHorizontal, Mail, Phone, Users, UserCheck, Pencil, Trash2, Eye, Tag, Sparkles, RotateCcw } from "lucide-react";

const CandidatesPage = () => {
  const { currentAccount } = useOrganization();
  const { deleteCandidate } = useRecruitmentActions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [hireDialogOpen, setHireDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [filters, setFilters] = useState<CandidateFiltersState>(INITIAL_FILTERS);
  const [selectedCandidateForDetails, setSelectedCandidateForDetails] = useState<any | null>(null);
  const [selectedCandidateForTags, setSelectedCandidateForTags] = useState<{
    id: string;
    name: string;
    tags: string[];
  } | null>(null);
  const [selectedCandidateForHire, setSelectedCandidateForHire] = useState<{
    id: string;
    name: string;
    email?: string;
  } | null>(null);
  const [selectedApplicationForHire, setSelectedApplicationForHire] = useState<{
    id: string;
    jobId?: string;
    jobTitle?: string;
    jobDepartment?: string;
  } | undefined>(undefined);
  const [selectedCandidateForEdit, setSelectedCandidateForEdit] = useState<{
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    linkedinUrl?: string;
  } | null>(null);
  const [candidateToDelete, setCandidateToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [resetTarget, setResetTarget] = useState<{
    candidateId: string;
    candidateName: string;
    applications: Array<{ id: string; jobId: string; jobTitle: string }>;
    selectedAppId: string | null;
  } | null>(null);

  // Fetch jobs for filter dropdown
  const { data: jobsData = [] } = useQuery({
    queryKey: ["recruitment-jobs-simple", currentAccount?.id],
    queryFn: async () => {
      if (!currentAccount?.id) return [];
      const { data, error } = await supabase
        .from("recruitment_jobs")
        .select("id, title")
        .eq("account_id", currentAccount.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentAccount?.id,
  });

  // Fetch candidates that applied to jobs in this company (from applications and culture interviews)
  const { data: candidatesData = [], isLoading } = useQuery({
    queryKey: ["recruitment-candidates", currentAccount?.id],
    queryFn: async () => {
      if (!currentAccount?.id) return [];
      
      // First get all jobs from this company
      const { data: companyJobs, error: jobsError } = await supabase
        .from("recruitment_jobs")
        .select("id, title")
        .eq("account_id", currentAccount.id);
      
      if (jobsError) throw jobsError;
      if (!companyJobs || companyJobs.length === 0) {
        // Still get direct candidates even if no jobs
        const { data: directCandidates, error: directError } = await supabase
          .from("recruitment_candidates")
          .select("id, first_name, last_name, email, phone, linkedin_url, created_at, stage, avatar_url, tags, source")
          .eq("account_id", currentAccount.id);
        
        if (directError) throw directError;
        
        return (directCandidates || []).map(c => ({
          id: c.id,
          full_name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Sem nome',
          first_name: c.first_name,
          last_name: c.last_name,
          email: c.email || '',
          phone: c.phone || '',
          city: '',
          linkedin_url: c.linkedin_url,
          created_at: c.created_at,
          user_id: null,
          avatar_url: c.avatar_url,
          tags: c.tags || [],
          source: c.source || 'direct',
          applicationCount: 0,
          jobTitles: [] as string[],
          jobIds: [] as string[],
          latestStatus: c.stage || 'applied',
          matchingScore: null as number | null,
          appliedAt: c.created_at,
          sourceType: 'direct' as const,
        }));
      }
      
      const jobIds = companyJobs.map(j => j.id);
      const jobTitleMap = new Map(companyJobs.map(j => [j.id, j.title]));
      
      // Get applications for these jobs
      const { data: applications, error: appError } = await supabase
        .from("recruitment_applications")
        .select(`
          id,
          status,
          applied_at,
          candidate_id,
          job_id,
          source
        `)
        .in("job_id", jobIds)
        .neq("source", "test-e2e");
      
      if (appError) console.warn("Applications fetch error:", appError);
      
      // Get culture interview sessions for these jobs
      const [interviewsRes, discRes, techRes] = await Promise.all([
        supabase
          .from("culture_interview_sessions")
          .select("id, status, matching_score, created_at, candidate_profile_id, job_id")
          .in("job_id", jobIds),
        supabase
          .from("candidate_disc_sessions")
          .select("id, candidate_id, status, candidate:candidate_profiles!candidate_disc_sessions_candidate_profile_id_fkey(id)")
          .in("job_id", jobIds)
          .eq("status", "completed"),
        supabase
          .from("technical_interview_sessions")
          .select("id, candidate_id, candidate_profile_id, status, overall_score")
          .in("job_id", jobIds)
          .eq("status", "completed"),
      ]);
      
      const interviews = interviewsRes.data || [];
      if (interviewsRes.error) console.warn("Interviews fetch error:", interviewsRes.error);
      
      const discSessions = discRes.data || [];
      const techSessions = techRes.data || [];

      // Fetch DISC scores via RPC to avoid nested RLS issues
      const discSessionIds = discSessions.map((s: any) => s.id);
      let discScoreMap = new Map<string, number>();
      if (discSessionIds.length > 0) {
        const { data: discScores } = await supabase.rpc('get_disc_match_scores', {
          p_session_ids: discSessionIds
        });
        discScoreMap = new Map((discScores || []).map((r: any) => [r.session_id, r.match_score]));
      }
      
      // Get candidates directly from recruitment_candidates for this account
      const { data: directCandidates, error: directError } = await supabase
        .from("recruitment_candidates")
        .select("id, first_name, last_name, email, phone, linkedin_url, created_at, stage, avatar_url, tags, source")
        .eq("account_id", currentAccount.id);
      
      if (directError) console.warn("Direct candidates fetch error:", directError);
      
      // Combine unique candidate IDs from both sources
      const interviewCandidateIds = (interviews || [])
        .filter(i => i.candidate_profile_id)
        .map(i => i.candidate_profile_id);
      const appCandidateIds = (applications || [])
        .filter(a => a.candidate_id)
        .map(a => a.candidate_id);
      
      const candidateProfileIds = [...new Set([...interviewCandidateIds, ...appCandidateIds])];
      
      // If no candidate profiles but we have direct candidates, return those
      if (candidateProfileIds.length === 0 && (!directCandidates || directCandidates.length === 0)) return [];
      
      // If we have direct candidates, also include their data
      const directCandidatesFormatted = (directCandidates || []).map(c => ({
        id: c.id,
        full_name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Sem nome',
        first_name: c.first_name,
        last_name: c.last_name,
        email: c.email || '',
        phone: c.phone || '',
        city: '',
        linkedin_url: c.linkedin_url,
        created_at: c.created_at,
        user_id: null,
        avatar_url: c.avatar_url,
        tags: c.tags || [],
        source: c.source || 'direct',
        applicationCount: 0,
        jobTitles: [] as string[],
        jobIds: [] as string[],
        latestStatus: c.stage || 'applied',
        matchingScore: null as number | null,
        appliedAt: c.created_at,
        sourceType: 'direct' as const,
      }));
      
      if (candidateProfileIds.length === 0) {
        return directCandidatesFormatted;
      }
      
      // Fetch candidate profiles
      const { data: profiles, error: profileError } = await supabase
        .from("candidate_profiles")
        .select("*")
        .in("id", candidateProfileIds);
      
      if (profileError) throw profileError;
      
      // Fetch user emails from profiles table
      const userIds = profiles?.map(p => p.user_id).filter(Boolean) || [];
      const { data: userProfiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", userIds);
      
      const emailMap = new Map(userProfiles?.map(p => [p.id, p.email]) || []);
      
      // Combine data from candidate profiles
      const profileCandidates = profiles?.map(profile => {
        // Get interviews for this candidate
        const candidateInterviews = (interviews || []).filter(i => i.candidate_profile_id === profile.id);
        const candidateApps = (applications || []).filter(a => a.candidate_id === profile.id);
        
        // Get job titles and IDs using the jobTitleMap
        const interviewJobIds = candidateInterviews.map(i => i.job_id).filter(Boolean);
        const appJobIds = candidateApps.map(a => a.job_id).filter(Boolean);
        const candidateJobIds = [...new Set([...interviewJobIds, ...appJobIds])];
        const interviewJobTitles = candidateInterviews.map(i => jobTitleMap.get(i.job_id)).filter(Boolean) as string[];
        const appJobTitles = candidateApps.map(a => jobTitleMap.get(a.job_id)).filter(Boolean) as string[];
        const jobTitles = [...new Set([...interviewJobTitles, ...appJobTitles])];
        
        // Get latest matching score if available
        const completedInterview = candidateInterviews.find(i => i.status === 'completed');
        const matchingScore = completedInterview?.matching_score;
        
        // Get DISC and tech scores for this candidate profile
        const candidateDisc = (discSessions as any[]).find(d => d.candidate?.id === profile.id);
        const discScore = candidateDisc ? (discScoreMap.get(candidateDisc.id) ?? null) : null;
        
        const candidateTech = (techSessions as any[]).find(t => t.candidate_profile_id === profile.id);
        const techScore = candidateTech?.overall_score ?? null;
        
        // Determine status
        let latestStatus = 'applied';
        if (completedInterview) {
          latestStatus = 'interviewed';
        } else if (candidateApps.length > 0) {
          latestStatus = candidateApps[0]?.status || 'applied';
        }
        
        // Get source from applications
        const source = candidateApps[0]?.source || 'careers_page';
        
        const email = emailMap.get(profile.user_id) || '';
        const createdAt = candidateInterviews[0]?.created_at || candidateApps[0]?.applied_at || profile.created_at;
        
        return {
          ...profile,
          email,
          tags: [],
          source,
          applicationCount: jobTitles.length,
          jobTitles,
          jobIds: candidateJobIds,
          applications: candidateApps.map(a => ({
            id: a.id,
            jobId: a.job_id,
            jobTitle: jobTitleMap.get(a.job_id) || 'Vaga',
          })),
          latestStatus,
          matchingScore,
          discScore,
          techScore,
          appliedAt: createdAt,
        };
      }) || [];
      
      // Merge with direct candidates (avoid duplicates based on email)
      const profileEmails = new Set(profileCandidates.map(p => p.email?.toLowerCase()).filter(Boolean));
      const uniqueDirectCandidates = directCandidatesFormatted.filter(
        dc => !profileEmails.has(dc.email?.toLowerCase())
      );
      
      return [...profileCandidates, ...uniqueDirectCandidates];
    },
    enabled: !!currentAccount?.id,
    staleTime: 0,
  });

  // Transform data to match component expectations
  const candidates = candidatesData.map((c: any) => {
    const { score: compositeScore } = calculateCompositeScore(
      c.matchingScore ?? c.matching_score ?? null,
      c.discScore ?? null,
      c.techScore ?? null,
    );
    return {
      id: c.id,
      name: c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Sem nome',
      firstName: c.first_name,
      lastName: c.last_name,
      email: c.email || '',
      phone: c.phone || '',
      city: c.city || '',
      stage: c.latestStatus || 'applied',
      jobTitles: c.jobTitles || [],
      jobIds: c.jobIds || [],
      applications: c.applications || [],
      applicationCount: c.applicationCount || 0,
      avatar: c.avatar_url || '',
      appliedAt: c.appliedAt,
      linkedinUrl: c.linkedin_url,
      matchingScore: c.matchingScore,
      compositeScore,
      sourceType: c.sourceType,
      tags: c.tags || [],
      source: c.source || 'direct',
    };
  });

  // Auto-open modal when ?view= parameter is present (from Kanban navigation)
  useEffect(() => {
    const viewCandidateId = searchParams.get("view");
    if (viewCandidateId && candidates.length > 0) {
      const candidate = candidates.find(c => c.id === viewCandidateId);
      if (candidate) {
        setSelectedCandidateForDetails(candidate);
        setDetailsModalOpen(true);
        // Clear the URL parameter after opening
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, candidates, setSearchParams]);

  // Apply filters
  const filteredCandidates = useMemo(() => {
    let result = candidates;

    // Text search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) ||
          c.tags?.some((tag: string) => tag.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (filters.statuses.length > 0) {
      result = result.filter((c) => filters.statuses.includes(c.stage));
    }

    // Tags filter
    if (filters.tags.length > 0) {
      result = result.filter((c) =>
        filters.tags.some((tag) => c.tags?.includes(tag))
      );
    }

    // Source filter
    if (filters.sources.length > 0) {
      result = result.filter((c) => filters.sources.includes(c.source));
    }

    // Date range filter
    if (filters.dateRange.from) {
      result = result.filter((c) => {
        const appliedDate = new Date(c.appliedAt);
        const fromDate = filters.dateRange.from!;
        const toDate = filters.dateRange.to || new Date();
        return appliedDate >= fromDate && appliedDate <= toDate;
      });
    }

    // Score range filter
    if (filters.scoreRange.length > 0) {
      result = result.filter((c) => {
        const score = c.matchingScore;
        if (filters.scoreRange.includes("none") && score === null) return true;
        if (score === null) return false;
        if (filters.scoreRange.includes("high") && score >= 75) return true;
        if (filters.scoreRange.includes("medium") && score >= 50 && score < 75) return true;
        if (filters.scoreRange.includes("low") && score < 50) return true;
        return false;
      });
    }

    // Job filter
    if (filters.jobIds.length > 0) {
      result = result.filter((c) =>
        filters.jobIds.some((jobId) => c.jobIds?.includes(jobId))
      );
    }

    return result;
  }, [candidates, searchQuery, filters]);

  const { sortConfig, handleSort, sortedData: sortedCandidates } = useTableSort(filteredCandidates, { key: "name", direction: "asc" });

  const toggleSelectAll = () => {
    if (selectedCandidates.length === sortedCandidates.length) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(sortedCandidates.map((c) => c.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedCandidates((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleHireClick = async (candidate: { id: string; name: string; email: string }) => {
    setSelectedCandidateForHire({
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
    });
    setSelectedApplicationForHire(undefined);
    setHireDialogOpen(true);

    // Try to resolve the most recent active application for this candidate to
    // make sure post-hire automations (fees, warranty, NPS, checklist) run.
    try {
      const { data } = await supabase
        .from("recruitment_applications")
        .select("id, job_id, status, applied_at, recruitment_jobs:job_id(title, department)")
        .eq("candidate_id", candidate.id)
        .eq("account_id", currentAccount?.id || "")
        .neq("status", "rejected")
        .neq("status", "desqualificado")
        .order("applied_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        const job: any = Array.isArray(data.recruitment_jobs) ? data.recruitment_jobs[0] : data.recruitment_jobs;
        setSelectedApplicationForHire({
          id: data.id,
          jobId: data.job_id || undefined,
          jobTitle: job?.title,
          jobDepartment: job?.department,
        });
      }
    } catch (err) {
      console.warn("[CandidatesPage] Could not resolve application for hire:", err);
    }
  };

  const handleEditClick = (candidate: any) => {
    setSelectedCandidateForEdit({
      id: candidate.id,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email,
      phone: candidate.phone,
      linkedinUrl: candidate.linkedinUrl,
    });
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (candidate: { id: string; name: string }) => {
    setCandidateToDelete(candidate);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (candidateToDelete) {
      deleteCandidate.mutate({ candidateId: candidateToDelete.id });
    }
    setDeleteDialogOpen(false);
    setCandidateToDelete(null);
  };

  const handleTagManagerOpen = (candidate: any) => {
    setSelectedCandidateForTags({
      id: candidate.id,
      name: candidate.name,
      tags: candidate.tags || [],
    });
    setTagManagerOpen(true);
  };

  return (
    <RecruitmentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">
              Candidatos <span className="text-muted-foreground font-normal">({filteredCandidates.length})</span>
            </h1>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar candidato
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Filters */}
        <CandidateFilters
          filters={filters}
          onFiltersChange={setFilters}
          jobs={jobsData}
        />

        {/* Table */}
        <div className="border rounded-lg">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : sortedCandidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">Nenhum candidato encontrado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery || Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : v) 
                  ? "Tente ajustar seus filtros" 
                  : "Adicione seu primeiro candidato para começar"}
              </p>
              {!searchQuery && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar candidato
                </Button>
              )}
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedCandidates.length === sortedCandidates.length && sortedCandidates.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <SortableHeader
                  label="Nome"
                  sortKey="name"
                  currentSortKey={sortConfig.key}
                  direction={sortConfig.direction}
                  onSort={handleSort}
                />
                <TableHead>Contato</TableHead>
                <TableHead>Tags</TableHead>
                <SortableHeader
                  label="Score IA"
                  sortKey="compositeScore"
                  currentSortKey={sortConfig.key}
                  direction={sortConfig.direction}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Status"
                  sortKey="stage"
                  currentSortKey={sortConfig.key}
                  direction={sortConfig.direction}
                  onSort={handleSort}
                />
                <TableHead>Vagas Aplicadas</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCandidates.map((candidate) => (
                <TableRow key={candidate.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedCandidates.includes(candidate.id)}
                      onCheckedChange={() => toggleSelect(candidate.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={candidate.avatar} />
                        <AvatarFallback className="text-xs">
                          {candidate.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="font-medium">{candidate.name}</span>
                        {candidate.linkedinUrl && (
                          <a 
                            href={candidate.linkedinUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block text-xs text-blue-500 hover:underline"
                          >
                            LinkedIn
                          </a>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {candidate.email && (
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Mail className="h-3.5 w-3.5" />
                          {candidate.email}
                        </div>
                      )}
                      {candidate.phone && (
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Phone className="h-3.5 w-3.5" />
                          {candidate.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1 max-w-[200px]">
                      {candidate.tags?.slice(0, 3).map((tag: string) => (
                        <TagBadge key={tag} tag={tag} />
                      ))}
                      {candidate.tags?.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{candidate.tags.length - 3}
                        </Badge>
                      )}
                      {(!candidate.tags || candidate.tags.length === 0) && (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {candidate.compositeScore !== null ? (
                      <Badge variant={getCompositeScoreBadgeVariant(candidate.compositeScore)} className="text-[10px] gap-1">
                        <Sparkles className="h-3 w-3" />
                        {candidate.compositeScore}%
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={candidate.stage} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      {candidate.jobTitles.slice(0, 2).map((job: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {job}
                        </Badge>
                      ))}
                      {candidate.jobTitles.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{candidate.jobTitles.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setSelectedCandidateForDetails(candidate);
                          setDetailsModalOpen(true);
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleTagManagerOpen(candidate)}>
                          <Tag className="h-4 w-4 mr-2" />
                          Gerenciar tags
                        </DropdownMenuItem>
                        {candidate.sourceType === 'direct' && (
                          <DropdownMenuItem onClick={() => handleEditClick(candidate)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {candidate.applications && candidate.applications.length > 0 && (
                          <DropdownMenuItem
                            onClick={() => setResetTarget({
                              candidateId: candidate.id,
                              candidateName: candidate.name,
                              applications: candidate.applications,
                              selectedAppId: candidate.applications.length === 1
                                ? candidate.applications[0].id
                                : null,
                            })}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Liberar para Refazer Etapa
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleHireClick(candidate)}
                          className="text-green-600 focus:text-green-600"
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Contratar
                        </DropdownMenuItem>
                        {candidate.sourceType === 'direct' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDeleteClick(candidate)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <CreateCandidateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <EditCandidateDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        candidate={selectedCandidateForEdit}
      />

      {selectedCandidateForHire && (
        <HireCandidateDialog
          open={hireDialogOpen}
          onOpenChange={setHireDialogOpen}
          candidate={selectedCandidateForHire}
          application={selectedApplicationForHire}
        />
      )}

      {/* Tag Manager Dialog */}
      {selectedCandidateForTags && (
        <CandidateTagManager
          open={tagManagerOpen}
          onOpenChange={setTagManagerOpen}
          candidateId={selectedCandidateForTags.id}
          candidateName={selectedCandidateForTags.name}
          currentTags={selectedCandidateForTags.tags}
        />
      )}

      {/* Candidate Details Modal */}
      <CandidateDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        candidateId={selectedCandidateForDetails?.id || null}
        candidateData={selectedCandidateForDetails ? {
          name: selectedCandidateForDetails.name,
          email: selectedCandidateForDetails.email,
          phone: selectedCandidateForDetails.phone,
          city: selectedCandidateForDetails.city,
          stage: selectedCandidateForDetails.stage,
          jobTitles: selectedCandidateForDetails.jobTitles,
          avatar: selectedCandidateForDetails.avatar,
          linkedinUrl: selectedCandidateForDetails.linkedinUrl,
          matchingScore: selectedCandidateForDetails.matchingScore,
          appliedAt: selectedCandidateForDetails.appliedAt,
        } : undefined}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir candidato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o candidato "{candidateToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCandidateToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Job picker (when candidate has multiple applications) */}
      {resetTarget && resetTarget.selectedAppId === null && (
        <AlertDialog open onOpenChange={(o) => !o && setResetTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Em qual vaga liberar?</AlertDialogTitle>
              <AlertDialogDescription>
                {resetTarget.candidateName} se candidatou a mais de uma vaga. Escolha em qual delas liberar a etapa.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 py-2">
              {resetTarget.applications.map((app) => (
                <Button
                  key={app.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setResetTarget({ ...resetTarget, selectedAppId: app.id })}
                >
                  {app.jobTitle}
                </Button>
              ))}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setResetTarget(null)}>Cancelar</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Reset step dialog */}
      {resetTarget && resetTarget.selectedAppId && (() => {
        const app = resetTarget.applications.find(a => a.id === resetTarget.selectedAppId);
        if (!app) return null;
        return (
          <ResetStepDialog
            open
            onOpenChange={(o) => !o && setResetTarget(null)}
            candidateId={resetTarget.candidateId}
            candidateName={resetTarget.candidateName}
            jobId={app.jobId}
            applicationId={app.id}
          />
        );
      })()}
    </RecruitmentLayout>
  );
};

export default CandidatesPage;
