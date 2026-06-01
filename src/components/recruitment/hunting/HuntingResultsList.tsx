import { useState, useEffect } from 'react';
import { safeScrapeString } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HuntingCandidateDetail } from './HuntingCandidateDetail';
import { DiscoveryCascade } from './DiscoveryCascade';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Linkedin,
  Github,
  Globe,
  Instagram,
  ExternalLink,
  UserPlus,
  Trash2,
  Eye,
  Loader2,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Tag,
  StickyNote,
  ListPlus,
  Plus,
  X,
  Star,
  Phone,
  Mail,
  Briefcase,
  Clock,
  AlertTriangle,
  Zap,
  Database,
  Sparkles,
  Award,
  EyeOff,
  Code2,
  Sparkles as SparklesIcon,
} from 'lucide-react';
import type { HuntingResult } from '@/hooks/useHuntingSearch';
import { HuntingApproachModal } from './HuntingApproachModal';
import { IntentSignalsList } from './IntentSignalBadge';
import { HuntingMultiSourceDialog } from './HuntingMultiSourceDialog';
import { SocialLinksRow, type SocialLinks } from './SocialLinksRow';
import { EmailValidationBadge } from './EmailValidationBadge';
import { useEmailValidation } from '@/hooks/useEmailValidation';
import { HuntingCandidateComparison } from './HuntingCandidateComparison';
import { useQuery } from '@tanstack/react-query';
import { useHuntingApproach } from '@/hooks/useHuntingApproach';
import { useHuntingShortlists, type Shortlist } from '@/hooks/useHuntingShortlists';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HuntingResultsListProps {
  results: HuntingResult[];
  accountId: string;
  jobId?: string;
  onScrapeProfile: (resultId: string, url: string) => Promise<unknown>;
  onImportSelected: (resultIds: string[]) => Promise<unknown>;
  onDiscardSelected: (resultIds: string[]) => Promise<unknown>;
  onResultUpdated?: () => void;
  isLoading?: boolean;
  confidenceThreshold?: number;
}

const SOURCE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  linkedin: Linkedin,
  github: Github,
  stackoverflow: Code2,
  portfolio: Globe,
  other: Globe,
};

const SOURCE_COLORS: Record<string, string> = {
  linkedin: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  github: 'bg-gray-500/10 text-gray-600 border-gray-500/30',
  stackoverflow: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  portfolio: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  other: 'bg-muted text-muted-foreground',
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  pending: { label: 'Pendente', icon: Clock, color: 'bg-yellow-500/10 text-yellow-600' },
  processing: { label: 'Processando...', icon: Loader2, color: 'bg-amber-500/10 text-amber-600' },
  reviewed: { label: 'Analisado', icon: Eye, color: 'bg-blue-500/10 text-blue-600' },
  shortlisted: { label: 'Shortlist', icon: Star, color: 'bg-purple-500/10 text-purple-600' },
  interviewing: { label: 'Entrevista', icon: Phone, color: 'bg-cyan-500/10 text-cyan-600' },
  offer_sent: { label: 'Proposta', icon: Mail, color: 'bg-orange-500/10 text-orange-600' },
  hired: { label: 'Contratado', icon: CheckCircle2, color: 'bg-green-500/10 text-green-600' },
  imported: { label: 'Importado', icon: UserPlus, color: 'bg-green-500/10 text-green-600' },
  rejected: { label: 'Rejeitado', icon: AlertTriangle, color: 'bg-red-500/10 text-red-600' },
  discarded: { label: 'Descartado', icon: XCircle, color: 'bg-red-500/10 text-red-600' },
  withdrawn: { label: 'Desistiu', icon: XCircle, color: 'bg-gray-500/10 text-gray-600' },
};

const ACTIVE_STATUSES = ['pending', 'reviewed', 'shortlisted', 'interviewing', 'offer_sent'];

export function HuntingResultsList({
  results,
  accountId,
  jobId,
  onScrapeProfile,
  onImportSelected,
  onDiscardSelected,
  onResultUpdated,
  isLoading = false,
  confidenceThreshold = 60,
}: HuntingResultsListProps) {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [scrapingId, setScrapingId] = useState<string | null>(null);
  const [approachingResult, setApproachingResult] = useState<HuntingResult | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [showNewShortlistDialog, setShowNewShortlistDialog] = useState(false);
  const [newShortlistName, setNewShortlistName] = useState('');
  const [crossMatchingId, setCrossMatchingId] = useState<string | null>(null);
  const [batchCrossMatching, setBatchCrossMatching] = useState(false);
  const [instagramSearchId, setInstagramSearchId] = useState<string | null>(null);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [detailResult, setDetailResult] = useState<HuntingResult | null>(null);
  const [hideLowQuality, setHideLowQuality] = useState(true);
  const [tierFilter, setTierFilter] = useState<'all' | 'A' | 'B' | 'C' | 'unrated'>('all');
  const [rerankLoading, setRerankLoading] = useState(false);
  const [multiSourceOpen, setMultiSourceOpen] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [discardReason, setDiscardReason] = useState('');
  const [discardDetail, setDiscardDetail] = useState('');
  const [onlyValidEmails, setOnlyValidEmails] = useState(false);
  const { isValidating, validateResults } = useEmailValidation();

  const {
    currentApproach,
    generateApproach,
    isGenerating,
    sendApproach,
    isSending,
    regenerateApproach,
    clearApproach,
  } = useHuntingApproach();

  const {
    shortlists,
    fetchShortlists,
    createShortlist,
    addToShortlist,
  } = useHuntingShortlists(jobId);

  useEffect(() => {
    fetchShortlists();
  }, [fetchShortlists]);

  // Cross-match suggestions count per result
  const resultIds = results.map(r => r.id);
  const { data: crossMatchCounts } = useQuery({
    queryKey: ['cross-match-counts', resultIds.join(',')],
    queryFn: async () => {
      if (resultIds.length === 0) return {};
      const { data } = await supabase
        .from('recruitment_cross_match_suggestions')
        .select('source_result_id, id')
        .in('source_result_id', resultIds)
        .eq('status', 'pending');
      const counts: Record<string, number> = {};
      (data || []).forEach((s: any) => {
        counts[s.source_result_id] = (counts[s.source_result_id] || 0) + 1;
      });
      return counts;
    },
    enabled: resultIds.length > 0,
  });

  const passesFilters = (r: HuntingResult) => {
    if (hideLowQuality && r.is_low_quality) return false;
    if (tierFilter !== 'all') {
      if (tierFilter === 'unrated' && r.llm_tier) return false;
      if (tierFilter !== 'unrated' && r.llm_tier !== tierFilter) return false;
    }
    if (onlyValidEmails && r.email_validation_status !== 'valid') return false;
    return true;
  };

  // Computa redes sociais a partir do extracted_data + source_url
  const buildSocialLinks = (r: HuntingResult): SocialLinks => {
    const data = (r.extracted_data || {}) as Record<string, unknown>;
    const out: SocialLinks = {};
    const ensure = (v: unknown): string | undefined => {
      if (!v || typeof v !== 'string') return undefined;
      const t = v.trim();
      if (!t) return undefined;
      return /^https?:\/\//i.test(t) ? t : `https://${t}`;
    };
    out.linkedin = ensure(data.linkedin_url) || ensure(data.linkedin) ||
      (r.source_url && r.source_url.includes('linkedin.com/in/') ? r.source_url : undefined);
    out.instagram = ensure(data.instagram_url) || ensure(data.instagram);
    const ig = data.instagram_data as { username?: string } | undefined;
    if (!out.instagram && ig?.username) out.instagram = `https://instagram.com/${ig.username.replace(/^@/, '')}`;
    out.github = ensure(data.github_url) || ensure(data.github) ||
      (r.source_url && r.source_url.includes('github.com/') ? r.source_url : undefined);
    out.twitter = ensure(data.twitter_url) || ensure(data.x_url) || ensure(data.twitter);
    out.website = ensure(data.website) || ensure(data.personal_website) || ensure(data.blog_url);
    // Varre social_links nested se existir
    const nested = data.social_links as Partial<SocialLinks> | undefined;
    if (nested) {
      (Object.keys(nested) as Array<keyof SocialLinks>).forEach((k) => {
        if (!out[k]) out[k] = ensure(nested[k]);
      });
    }
    return Object.fromEntries(Object.entries(out).filter(([, v]) => !!v)) as SocialLinks;
  };

  const handleValidateEmails = async () => {
    const ids = selectedIds.length > 0
      ? selectedIds.filter((id) => {
          const r = results.find((x) => x.id === id);
          const data = r?.extracted_data as { email?: string } | undefined;
          return !!(data?.email || (data as { apollo_enrichment?: { email?: string } })?.apollo_enrichment?.email);
        })
      : visibleResults
          .filter((r) => {
            const data = r.extracted_data as { email?: string; apollo_enrichment?: { email?: string } } | undefined;
            return !!(data?.email || data?.apollo_enrichment?.email) && !r.email_validation_status;
          })
          .map((r) => r.id);
    const resp = await validateResults(ids);
    if (resp && onResultUpdated) onResultUpdated();
  };

  const visibleResults = results.filter(passesFilters);
  const hiddenLowQualityCount = results.filter((r) => r.is_low_quality && ACTIVE_STATUSES.includes(r.status)).length;
  const activeResults = visibleResults.filter((r) => ACTIVE_STATUSES.includes(r.status));
  const importedResults = visibleResults.filter((r) => r.status === 'imported' || r.status === 'hired');
  const closedResults = visibleResults.filter((r) => ['discarded', 'rejected', 'withdrawn'].includes(r.status));

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleAllActive = () => {
    const allIds = activeResults.map((r) => r.id);
    const allSelected = allIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...allIds])]);
    }
  };

  const handleScrape = async (result: HuntingResult) => {
    if (!result.source_url) return;
    setScrapingId(result.id);
    try {
      await onScrapeProfile(result.id, result.source_url);
    } catch (err) {
      console.error('handleScrape error:', err);
    } finally {
      setScrapingId(null);
    }
  };

  const handleImport = async () => {
    await onImportSelected(selectedIds);
    setSelectedIds([]);
  };

  const openDiscardDialog = () => {
    if (selectedIds.length === 0) return;
    setDiscardReason('');
    setDiscardDetail('');
    setDiscardDialogOpen(true);
  };

  const handleDiscard = async () => {
    if (!discardReason) {
      toast({ title: 'Selecione um motivo', variant: 'destructive' });
      return;
    }
    // Persist rejection patterns for each selected
    const selected = results.filter((r) => selectedIds.includes(r.id));
    try {
      const rows = selected
        .filter((r) => r.id)
        .map((r) => ({
          account_id: accountId,
          job_id: jobId || null,
          hunting_result_id: r.id,
          reason_category: discardReason,
          reason_detail: discardDetail || null,
          profile_signals: {
            title: (r.extracted_data as any)?.currentTitle || (r.extracted_data as any)?.title,
            company: (r.extracted_data as any)?.currentCompany || (r.extracted_data as any)?.company,
            location: (r.extracted_data as any)?.location,
            match_score: r.match_score,
            llm_tier: r.llm_tier,
          },
        }));
      if (rows.length > 0) {
        await supabase.from('recruitment_hunting_rejection_patterns').insert(rows);
      }
      // Mark each result with rejection_reason
      await supabase
        .from('recruitment_hunting_results')
        .update({ rejection_reason: discardReason })
        .in('id', selectedIds);
    } catch (e) {
      console.error('rejection_patterns insert error', e);
    }
    await onDiscardSelected(selectedIds);
    setSelectedIds([]);
    setDiscardDialogOpen(false);
    // Trigger pattern detection async (fire and forget)
    if (jobId) {
      supabase.functions.invoke('hunting-detect-rejection-patterns', { body: { job_id: jobId } })
        .then(() => onResultUpdated?.())
        .catch((e) => console.error('detect-rejection-patterns', e));
    }
  };

  const handleRerank = async () => {
    const searchId = results[0]?.search_id;
    if (!searchId) {
      toast({ title: 'Nenhum resultado para avaliar', variant: 'destructive' });
      return;
    }
    setRerankLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('hunting-llm-rerank', {
        body: { search_id: searchId, top_n: 30 },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha');
      toast({
        title: 'Re-ranking concluído',
        description: `${data.evaluated || 0} candidato(s) avaliados pela IA.`,
      });
      onResultUpdated?.();
    } catch (e: any) {
      toast({
        title: 'Falha no re-ranking',
        description: e?.message || 'Erro inesperado',
        variant: 'destructive',
      });
    } finally {
      setRerankLoading(false);
    }
  };

  const handleStatusChange = async (resultId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('recruitment_hunting_results')
        .update({ status: newStatus } as any)
        .eq('id', resultId);
      if (error) throw error;
      toast({ title: 'Status atualizado' });
      onResultUpdated?.();
    } catch {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    }
  };

  const handleSaveNotes = async (resultId: string) => {
    try {
      const { error } = await supabase
        .from('recruitment_hunting_results')
        .update({ recruiter_notes: notesText } as any)
        .eq('id', resultId);
      if (error) throw error;
      toast({ title: 'Notas salvas' });
      setEditingNotesId(null);
      onResultUpdated?.();
    } catch {
      toast({ title: 'Erro ao salvar notas', variant: 'destructive' });
    }
  };

  const handleAddTag = async (resultId: string, tag: string) => {
    if (!tag.trim()) return;
    const result = results.find(r => r.id === resultId);
    const currentTags = result?.tags || [];
    if (currentTags.includes(tag.trim())) return;

    const newTags = [...currentTags, tag.trim()];
    try {
      const { error } = await supabase
        .from('recruitment_hunting_results')
        .update({ tags: newTags } as any)
        .eq('id', resultId);
      if (error) throw error;
      setTagInput('');
      onResultUpdated?.();
    } catch {
      toast({ title: 'Erro ao adicionar tag', variant: 'destructive' });
    }
  };

  const handleRemoveTag = async (resultId: string, tag: string) => {
    const result = results.find(r => r.id === resultId);
    const newTags = (result?.tags || []).filter(t => t !== tag);
    try {
      const { error } = await supabase
        .from('recruitment_hunting_results')
        .update({ tags: newTags } as any)
        .eq('id', resultId);
      if (error) throw error;
      onResultUpdated?.();
    } catch {
      toast({ title: 'Erro ao remover tag', variant: 'destructive' });
    }
  };

  const handleAddToShortlist = async (shortlistId: string) => {
    if (selectedIds.length === 0) return;
    await addToShortlist(shortlistId, selectedIds);
    setSelectedIds([]);
    onResultUpdated?.();
  };

  const handleCreateAndAddToShortlist = async () => {
    if (!newShortlistName.trim()) return;
    const shortlist = await createShortlist(newShortlistName.trim());
    if (shortlist && selectedIds.length > 0) {
      await addToShortlist(shortlist.id, selectedIds);
      setSelectedIds([]);
      onResultUpdated?.();
    }
    setNewShortlistName('');
    setShowNewShortlistDialog(false);
  };

  const handleApproach = async (result: HuntingResult) => {
    setApproachingResult(result);
    try {
      await generateApproach({ huntingResultId: result.id, accountId });
    } catch {
      setApproachingResult(null);
    }
  };

  const handleSendApproach = async (message: string, phone: string) => {
    if (!currentApproach) return;
    await sendApproach({ approachId: currentApproach.id, message, phone });
    setApproachingResult(null);
  };

  const handleRegenerate = async (): Promise<string> => {
    if (!approachingResult) throw new Error('No result selected');
    return regenerateApproach(approachingResult.id, accountId);
  };

  const handleCrossMatch = async (resultId: string) => {
    setCrossMatchingId(resultId);
    try {
      const { data, error } = await supabase.functions.invoke('hunting-cross-match', {
        body: { result_id: resultId, account_id: accountId },
      });
      if (error) throw error;
      const count = data?.suggestions || 0;
      if (count > 0) {
        toast({ title: `${count} sugestão(ões) cross-vaga encontrada(s)!` });
      } else {
        toast({ title: 'Nenhuma sugestão cross-vaga encontrada' });
      }
      onResultUpdated?.();
    } catch {
      toast({ title: 'Erro ao rodar cross-match', variant: 'destructive' });
    } finally {
      setCrossMatchingId(null);
    }
  };

  const handleBatchCrossMatch = async () => {
    setBatchCrossMatching(true);
    let totalSuggestions = 0;
    try {
      for (const result of activeResults) {
        const { data } = await supabase.functions.invoke('hunting-cross-match', {
          body: { result_id: result.id, account_id: accountId },
        });
        totalSuggestions += data?.suggestions || 0;
      }
      toast({ title: `Cross-match em lote concluído: ${totalSuggestions} sugestão(ões) encontrada(s)` });
      onResultUpdated?.();
    } catch {
      toast({ title: 'Erro no cross-match em lote', variant: 'destructive' });
    } finally {
      setBatchCrossMatching(false);
    }
  };

  const handleSearchInstagram = async (result: HuntingResult) => {
    setInstagramSearchId(result.id);
    try {
      // Try to find Instagram from extracted data
      const data = result.extracted_data || {};
      const igData = data.instagram_data as { username?: string } | undefined;
      
      if (igData?.username) {
        toast({ title: `Instagram já encontrado: @${igData.username}` });
        return;
      }

      // Re-scrape the profile — the edge function now auto-discovers Instagram
      if (result.source_url) {
        await onScrapeProfile(result.id, result.source_url);
        toast({ title: 'Perfil re-analisado com busca de Instagram' });
        onResultUpdated?.();
      }
    } catch {
      toast({ title: 'Erro ao buscar Instagram', variant: 'destructive' });
    } finally {
      setInstagramSearchId(null);
    }
  };

  const isAboveThreshold = (result: HuntingResult) => {
    return result.match_score !== null && result.match_score >= confidenceThreshold;
  };

  const handleEnrich = async (result: HuntingResult) => {
    setEnrichingId(result.id);
    try {
      const { data, error } = await supabase.functions.invoke('hunting-clay-enrich', {
        body: { result_id: result.id },
      });
      if (error) throw error;
      if (data?.enriched) {
        toast({ title: 'Candidato enriquecido', description: `Fontes: ${data.sources?.join(', ')}` });
        onResultUpdated?.();
      } else {
        toast({ title: 'Sem dados adicionais encontrados' });
      }
    } catch {
      toast({ title: 'Erro ao enriquecer candidato', variant: 'destructive' });
    } finally {
      setEnrichingId(null);
    }
  };

  const renderScoreBreakdown = (result: HuntingResult) => {
    const breakdown = (result as any).score_breakdown || result.extracted_data?.score_breakdown;
    if (!breakdown) return null;

    const isV2 = !!breakdown.required_skills_evaluation;
    
    if (isV2) {
      return (
        <div className="mt-2 grid grid-cols-3 gap-1 text-xs">
          <div className="text-center p-1 rounded bg-muted/50">
            <div className="font-medium">{breakdown.required_score ?? 0}%</div>
            <div className="text-muted-foreground">Obrigatórios</div>
          </div>
          <div className="text-center p-1 rounded bg-muted/50">
            <div className="font-medium">{breakdown.desired_score ?? 0}%</div>
            <div className="text-muted-foreground">Desejáveis</div>
          </div>
          <div className="text-center p-1 rounded bg-muted/50">
            <div className="font-medium">{breakdown.location_score ?? 0}%</div>
            <div className="text-muted-foreground">Local</div>
          </div>
        </div>
      );
    }

    return (
      <div className="mt-2 grid grid-cols-4 gap-1 text-xs">
        <div className="text-center p-1 rounded bg-muted/50">
          <div className="font-medium">{breakdown.mandatory_skills_match}%</div>
          <div className="text-muted-foreground">Skills</div>
        </div>
        <div className="text-center p-1 rounded bg-muted/50">
          <div className="font-medium">{breakdown.nice_to_have_match}%</div>
          <div className="text-muted-foreground">Extras</div>
        </div>
        <div className="text-center p-1 rounded bg-muted/50">
          <div className="font-medium">{breakdown.experience_fit}%</div>
          <div className="text-muted-foreground">Exp.</div>
        </div>
        <div className="text-center p-1 rounded bg-muted/50">
          <div className="font-medium">{breakdown.culture_fit}%</div>
          <div className="text-muted-foreground">Cultura</div>
        </div>
      </div>
    );
  };

  const renderResult = (result: HuntingResult, showCheckbox = true) => {
    const SourceIcon = SOURCE_ICONS[result.source] || Globe;
    // Show "Processando" for pending results that haven't been scored yet
    const isScrapeFailure = !!(result.extracted_data as any)?.scrape_failed;
    const isProcessing = !isScrapeFailure && result.status === 'pending' && result.match_score === null && (result.score_source === 'pending' || result.score_source === 'preview');
    const displayStatus = isProcessing ? 'processing' : result.status;
    const statusConfig = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.pending;
    const StatusIcon = statusConfig.icon;
    const data = result.extracted_data || {};
    const name = data.name || data.title?.split(' - ')[0]?.trim() || data.title?.split(' at ')[0] || 'Perfil encontrado';
    const isSelected = selectedIds.includes(result.id);
    const isScraping = scrapingId === result.id;
    const canApproach = result.status === 'reviewed' && isAboveThreshold(result);
    const isApproachingThis = approachingResult?.id === result.id && isGenerating;
    const dealBreakers = data.score_breakdown?.details?.deal_breaker_flags || [];

    return (
      <div
        key={result.id}
        className={`p-4 border rounded-lg transition-colors cursor-pointer ${
          isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        }`}
        onClick={(e) => {
          // Don't open detail if clicking on interactive elements
          const target = e.target as HTMLElement;
          if (target.closest('button, input, textarea, select, [role="combobox"], [data-radix-collection-item]')) return;
          setDetailResult(result);
        }}
      >
        <div className="flex items-start gap-3">
          {showCheckbox && !['imported', 'discarded', 'hired', 'rejected'].includes(result.status) && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggleSelection(result.id)}
              className="mt-1"
            />
          )}

          <div className="flex-1 min-w-0">
            {/* Header badges */}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="outline" className={SOURCE_COLORS[result.source]}>
                <SourceIcon className="h-3 w-3 mr-1" />
                {result.source}
              </Badge>
              
              {/* Status dropdown */}
              <Select
                value={result.status}
                onValueChange={(val) => handleStatusChange(result.id, val)}
              >
                <SelectTrigger className={`h-6 w-auto px-2 text-xs border ${statusConfig.color}`}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key} className="text-xs">
                      {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {isProcessing && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 animate-pulse">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Calculando score...
                </Badge>
              )}

              {isScrapeFailure && (
                <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Score pendente
                </Badge>
              )}

              {result.match_score !== null && (
                <Badge
                  variant="outline"
                  className={isAboveThreshold(result)
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-muted text-muted-foreground"
                  }
                >
                  {result.match_score}% match
                </Badge>
              )}

              {result.llm_tier && (
                <Badge
                  variant="outline"
                  className={
                    result.llm_tier === 'A'
                      ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/40'
                      : result.llm_tier === 'B'
                      ? 'bg-blue-500/15 text-blue-700 border-blue-500/40'
                      : 'bg-zinc-500/10 text-zinc-600 border-zinc-500/30'
                  }
                  title={result.llm_justification || undefined}
                >
                  <Award className="h-3 w-3 mr-1" />
                  Tier {result.llm_tier}
                  {typeof result.final_score_llm === 'number' && ` · ${Math.round(result.final_score_llm)}`}
                </Badge>
              )}

              {result.is_low_quality && (
                <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/30" title={`Completude ${result.completeness_score || 0}%`}>
                  <EyeOff className="h-3 w-3 mr-1" />
                  Baixa qualidade
                </Badge>
              )}

              {Array.isArray(result.llm_red_flags) && result.llm_red_flags.length > 0 && (
                <Badge variant="destructive" className="text-xs" title={result.llm_red_flags.join(' · ')}>
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {result.llm_red_flags.length} red flag{result.llm_red_flags.length > 1 ? 's' : ''}
                </Badge>
              )}

              {Array.isArray(result.intent_signals) && result.intent_signals.length > 0 && (
                <IntentSignalsList signals={result.intent_signals} max={2} />
              )}

              {dealBreakers.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Deal breaker
                </Badge>
              )}

              {(crossMatchCounts?.[result.id] || 0) > 0 && (
                <Badge variant="info" className="text-xs">
                  <Briefcase className="h-3 w-3 mr-1" />
                  Encaixa +{crossMatchCounts![result.id]} vaga(s)
                </Badge>
              )}

              {(data as any).instagram_data?.username && (
                <Badge variant="outline" className="text-xs bg-pink-500/10 text-pink-600 border-pink-500/30">
                  <Instagram className="h-3 w-3 mr-1" />
                  @{(data as any).instagram_data.username}
                </Badge>
              )}

              {/* Apollo enrichment badges */}
              {(() => {
                const email = (data as any).apollo_enrichment?.email || (data as any).email;
                if (!email) return null;
                return (
                  <div className="inline-flex items-center gap-1">
                    <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                      <Mail className="h-3 w-3 mr-1" />
                      {email}
                    </Badge>
                    <EmailValidationBadge status={result.email_validation_status} />
                  </div>
                );
              })()}
              {(data as any).apollo_enrichment?.phone && (
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                  <Phone className="h-3 w-3 mr-1" />
                  {(data as any).apollo_enrichment.phone}
                </Badge>
              )}

              {/* Redes sociais (LinkedIn, Instagram, GitHub, Twitter, site) */}
              <SocialLinksRow links={buildSocialLinks(result)} className="ml-1" />

              {/* Source origin badge */}
              {(data as any).source_origin && (data as any).source_origin !== 'firecrawl' && (
                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                  <Database className="h-3 w-3 mr-1" />
                  Apollo
                </Badge>
              )}

            </div>

            {/* Cascata de descoberta de contato (transparência de fontes + custo) */}
            {(result as any).discovery_cascade && Array.isArray((result as any).discovery_cascade) && (result as any).discovery_cascade.length > 0 && (
              <div className="mt-1.5">
                <DiscoveryCascade
                  cascade={(result as any).discovery_cascade}
                  totalCost={Number((result as any).discovery_cost_credits ?? 0)}
                />
              </div>
            )}

            <h4 className="font-medium text-sm truncate">{name}</h4>

            {(() => {
              const titleStr = safeScrapeString(data.title);
              const companyStr = safeScrapeString(data.company);
              const locationStr = safeScrapeString(data.location);
              return (
                <>
                  {(titleStr || companyStr) && (
                    <p className="text-sm text-muted-foreground truncate">
                      {titleStr}{companyStr && ` @ ${companyStr}`}
                    </p>
                  )}
                  {locationStr && (
                    <p className="text-xs text-muted-foreground mt-1">📍 {locationStr}</p>
                  )}
                </>
              );
            })()}

            {/* Score breakdown */}
            {renderScoreBreakdown(result)}

            {/* Match reasoning */}
            {result.match_reasoning && (
              <p className="text-xs text-muted-foreground mt-2 italic">
                💡 {result.match_reasoning}
              </p>
            )}

            {/* Skills */}
            {data.skills && data.skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {data.skills.slice(0, 5).map((skill, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {data.skills.length > 5 && (
                  <Badge variant="secondary" className="text-xs">
                    +{data.skills.length - 5}
                  </Badge>
                )}
              </div>
            )}

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mt-2 items-center">
              {(result.tags || []).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs bg-accent/50 gap-1">
                  {tag}
                  <button onClick={() => handleRemoveTag(result.id, tag)} className="hover:text-destructive">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5">
                    <Tag className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="start">
                  <div className="flex gap-1">
                    <Input
                      placeholder="Nova tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      className="h-7 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddTag(result.id, tagInput);
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleAddTag(result.id, tagInput)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  {/* Quick tags */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {['ex-FAANG', 'disponível', 'liderança', 'remoto', 'sênior', 'urgente'].map(qt => (
                      <Badge
                        key={qt}
                        variant="outline"
                        className="text-xs cursor-pointer hover:bg-accent"
                        onClick={() => handleAddTag(result.id, qt)}
                      >
                        {qt}
                      </Badge>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Recruiter notes */}
            {editingNotesId === result.id ? (
              <div className="mt-2 space-y-1">
                <Textarea
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  placeholder="Observações sobre este candidato..."
                  className="text-xs min-h-[60px]"
                />
                <div className="flex gap-1">
                  <Button size="sm" className="h-6 text-xs" onClick={() => handleSaveNotes(result.id)}>
                    Salvar
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditingNotesId(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <button
                className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setEditingNotesId(result.id);
                  setNotesText(result.recruiter_notes || '');
                }}
              >
                <StickyNote className="h-3 w-3" />
                {result.recruiter_notes ? result.recruiter_notes.substring(0, 80) + (result.recruiter_notes.length > 80 ? '...' : '') : 'Adicionar nota...'}
              </button>
            )}

            {/* Action buttons */}
            <div className="flex gap-1 mt-2 flex-wrap">
              {isScrapeFailure && result.source_url && (
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 text-xs gap-1"
                  onClick={() => handleScrape(result)}
                  disabled={isScraping}
                >
                  {isScraping ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Zap className="h-3 w-3" />
                  )}
                  Reprocessar
                </Button>
              )}
              {canApproach && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => handleApproach(result)}
                  disabled={isApproachingThis}
                >
                  {isApproachingThis ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <MessageSquare className="h-3 w-3" />
                  )}
                  Abordar
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => handleCrossMatch(result.id)}
                disabled={crossMatchingId === result.id}
              >
                {crossMatchingId === result.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Briefcase className="h-3 w-3" />
                )}
              Cross-Match
              </Button>
              {!(data as any).apollo_enrichment && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => handleEnrich(result)}
                  disabled={enrichingId === result.id}
                >
                  {enrichingId === result.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Zap className="h-3 w-3" />
                  )}
                  Enriquecer
                </Button>
              )}
              {/* Scrape error display */}
              {(data as any).scrape_error && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {(data as any).scrape_error === 'APIFY_QUOTA_EXCEEDED' 
                    ? 'Cota Apify excedida' 
                    : 'Erro no scraping'}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {result.source_url && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => window.open(result.source_url!, '_blank')}
                title="Abrir perfil"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}

            {result.status === 'pending' && result.source_url && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleScrape(result)}
                disabled={isScraping}
                title="Analisar perfil"
              >
                {isScraping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const [showComparison, setShowComparison] = useState(false);

  const comparisonCandidates = results.filter(r => selectedIds.includes(r.id));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg">
            Resultados ({visibleResults.length}
            {visibleResults.length !== results.length && <span className="text-xs text-muted-foreground font-normal"> / {results.length}</span>})
          </CardTitle>

          <div className="flex items-center gap-2 flex-wrap">
            {results.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/5"
                onClick={handleRerank}
                disabled={rerankLoading}
                title="Avalia top 30 candidatos com IA: tier A/B/C, justificativa e red flags"
              >
                {rerankLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Re-rank com IA
              </Button>
            )}
            {jobId && accountId && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 border-violet-500/40 text-violet-600 hover:bg-violet-500/5"
                onClick={() => setMultiSourceOpen(true)}
                title="Diversificar fontes (GitHub, Stack Overflow), busca adaptativa e detecção de sinais"
              >
                <SparklesIcon className="h-3 w-3" />
                Mais fontes & sinais
              </Button>
            )}
            {activeResults.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleBatchCrossMatch}
                disabled={batchCrossMatching}
              >
                {batchCrossMatching ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Briefcase className="h-3 w-3" />
                )}
                Cross-Match em Lote
              </Button>
            )}
            {activeResults.length > 0 && (
              <Button variant="ghost" size="sm" onClick={toggleAllActive}>
                {activeResults.every((r) => selectedIds.includes(r.id))
                  ? 'Desmarcar todos'
                  : 'Selecionar todos'}
              </Button>
            )}
          </div>
        </div>

        {/* Quality filters */}
        <div className="flex items-center gap-2 pt-2 flex-wrap text-xs">
          <Select value={tierFilter} onValueChange={(v) => setTierFilter(v as any)}>
            <SelectTrigger className="h-7 w-[140px] text-xs">
              <Award className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todos os tiers</SelectItem>
              <SelectItem value="A" className="text-xs">Apenas Tier A</SelectItem>
              <SelectItem value="B" className="text-xs">Tier B+</SelectItem>
              <SelectItem value="C" className="text-xs">Tier C</SelectItem>
              <SelectItem value="unrated" className="text-xs">Sem avaliação IA</SelectItem>
            </SelectContent>
          </Select>

          <button
            type="button"
            className={`h-7 px-2 rounded border flex items-center gap-1 transition-colors ${
              hideLowQuality
                ? 'bg-orange-500/10 border-orange-500/30 text-orange-700'
                : 'bg-background border-border text-muted-foreground hover:bg-accent'
            }`}
            onClick={() => setHideLowQuality((v) => !v)}
            title="Esconder perfis com completude < 40%"
          >
            <EyeOff className="h-3 w-3" />
            {hideLowQuality
              ? `Esconder baixa qualidade${hiddenLowQualityCount > 0 ? ` (${hiddenLowQualityCount})` : ''}`
              : 'Mostrar todos'}
          </button>

          <button
            type="button"
            className={`h-7 px-2 rounded border flex items-center gap-1 transition-colors ${
              onlyValidEmails
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700'
                : 'bg-background border-border text-muted-foreground hover:bg-accent'
            }`}
            onClick={() => setOnlyValidEmails((v) => !v)}
            title="Mostrar apenas perfis com email validado"
          >
            <CheckCircle2 className="h-3 w-3" />
            {onlyValidEmails ? 'Apenas emails válidos' : 'Filtrar emails válidos'}
          </button>

          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={handleValidateEmails}
            disabled={isValidating}
            title={selectedIds.length > 0 ? 'Validar emails dos selecionados' : 'Validar emails ainda não verificados desta lista'}
          >
            {isValidating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
            Validar emails
          </Button>
        </div>


        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 pt-2 flex-wrap">
            <span className="text-sm text-muted-foreground">
              {selectedIds.length} selecionado(s)
            </span>
            <Button size="sm" onClick={handleImport} disabled={isLoading} className="h-7 text-xs">
              <UserPlus className="h-3 w-3 mr-1" />
              Importar
            </Button>
            <Button variant="outline" size="sm" onClick={openDiscardDialog} disabled={isLoading} className="h-7 text-xs">
              <Trash2 className="h-3 w-3 mr-1" />
              Descartar
            </Button>

            {selectedIds.length >= 2 && selectedIds.length <= 4 && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 border-primary/50 text-primary"
                onClick={() => setShowComparison(true)}
              >
                <Eye className="h-3 w-3" />
                Comparar ({selectedIds.length})
              </Button>
            )}

            {/* Shortlist dropdown */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                  <ListPlus className="h-3 w-3" />
                  Shortlist
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                {shortlists.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {shortlists.map(sl => (
                      <button
                        key={sl.id}
                        className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent flex justify-between items-center"
                        onClick={() => handleAddToShortlist(sl.id)}
                      >
                        <span className="truncate">{sl.name}</span>
                        <Badge variant="secondary" className="text-xs ml-2">{sl.items_count}</Badge>
                      </button>
                    ))}
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs gap-1"
                  onClick={() => setShowNewShortlistDialog(true)}
                >
                  <Plus className="h-3 w-3" />
                  Nova shortlist
                </Button>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {activeResults.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3 text-muted-foreground">
                  Ativos ({activeResults.length})
                </h3>
                <div className="space-y-2">
                  {activeResults.map((result) => renderResult(result))}
                </div>
              </div>
            )}

            {importedResults.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3 text-primary">
                  Importados / Contratados ({importedResults.length})
                </h3>
                <div className="space-y-2">
                  {importedResults.map((result) => renderResult(result, false))}
                </div>
              </div>
            )}

            {closedResults.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3 text-muted-foreground">
                  Fechados ({closedResults.length})
                </h3>
                <div className="space-y-2 opacity-60">
                  {closedResults.map((result) => renderResult(result, false))}
                </div>
              </div>
            )}

            {results.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum resultado encontrado
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {/* New shortlist dialog */}
      <Dialog open={showNewShortlistDialog} onOpenChange={setShowNewShortlistDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Shortlist</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nome da shortlist (ex: Finalistas Cliente X)"
            value={newShortlistName}
            onChange={(e) => setNewShortlistName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateAndAddToShortlist()}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNewShortlistDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateAndAddToShortlist} disabled={!newShortlistName.trim()}>
              Criar e adicionar {selectedIds.length} candidato(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discard reason dialog */}
      <Dialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Descartar {selectedIds.length} candidato(s)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Motivo da rejeição
              </label>
              <Select value={discardReason} onValueChange={setDiscardReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um motivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="missing_skill">Falta skill obrigatória</SelectItem>
                  <SelectItem value="seniority_mismatch">Senioridade não bate</SelectItem>
                  <SelectItem value="experience_insufficient">Experiência insuficiente</SelectItem>
                  <SelectItem value="experience_excessive">Experiência excessiva</SelectItem>
                  <SelectItem value="industry_mismatch">Indústria/segmento não bate</SelectItem>
                  <SelectItem value="location_mismatch">Localização incompatível</SelectItem>
                  <SelectItem value="competitor">Trabalha em concorrente</SelectItem>
                  <SelectItem value="culture_misfit">Não se encaixa na cultura</SelectItem>
                  <SelectItem value="profile_quality">Perfil incompleto / desatualizado</SelectItem>
                  <SelectItem value="duplicate">Duplicado / já abordado</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Observações (opcional)
              </label>
              <Textarea
                value={discardDetail}
                onChange={(e) => setDiscardDetail(e.target.value)}
                placeholder="Ex: tem só 2 anos em B2B, vaga pede 5+"
                className="min-h-[60px]"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              O motivo é registrado para o sistema sugerir ajustes no ICP da vaga após detectar padrões.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDiscardDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleDiscard} disabled={!discardReason || isLoading} variant="destructive">
              <Trash2 className="h-3 w-3 mr-1" />
              Descartar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approach Modal */}
      {currentApproach && approachingResult && (
        <HuntingApproachModal
          open={!!currentApproach}
          onOpenChange={(open) => {
            if (!open) {
              clearApproach();
              setApproachingResult(null);
            }
          }}
          candidateName={currentApproach.candidate_name}
          candidatePhone={currentApproach.phone_number}
          generatedMessage={currentApproach.message}
          matchScore={approachingResult.match_score}
          approachId={currentApproach.id}
          accountId={accountId}
          extractedData={approachingResult.extracted_data}
          onSend={handleSendApproach}
          onRegenerate={handleRegenerate}
          isSending={isSending}
        />
      )}

      {/* Candidate Comparison */}
      <HuntingCandidateComparison
        open={showComparison}
        onOpenChange={setShowComparison}
        candidates={comparisonCandidates}
      />

      {/* Multi-Source & Intent Signals Dialog */}
      {jobId && accountId && (
        <HuntingMultiSourceDialog
          open={multiSourceOpen}
          onOpenChange={setMultiSourceOpen}
          jobId={jobId}
          accountId={accountId}
          searchId={results[0]?.search_id ?? null}
          defaultSkills={[]}
          defaultLocation=""
          onComplete={() => onResultUpdated?.()}
        />
      )}

      {/* Candidate Detail Drawer */}
      <HuntingCandidateDetail
        open={!!detailResult}
        onOpenChange={(open) => { if (!open) setDetailResult(null); }}
        result={detailResult}
      />
    </Card>
  );
}
