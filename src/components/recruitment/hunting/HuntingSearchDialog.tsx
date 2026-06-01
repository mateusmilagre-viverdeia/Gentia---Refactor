import { useState, useEffect, useCallback, KeyboardEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, Linkedin, Github, Globe, Loader2, Instagram, Code2, X, ChevronDown, ChevronRight, Sparkles, AlertTriangle, Info, FileText, Target, Building2, Wand2, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BooleanSearchBuilder } from './BooleanSearchBuilder';
import { useJobICP } from '@/hooks/useJobICP';
import { useAccount } from '@/hooks/useAccount';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface HuntingSearchFilters {
  location?: string;
  locationCity?: string;
  locationState?: string;
  locationRadius?: number;
  seniority?: string;
  skills?: string[];
  niceToHaveSkills?: string[];
  targetCompanies?: string[];
  negativeKeywords?: string[];
  experienceMin?: number;
  experienceMax?: number;
  industry?: string;
  titleVariations?: string[];
  // Qualification fields (Category B - not used in search queries)
  salaryMin?: number;
  salaryMax?: number;
  workModel?: string;
  languages?: string[];
  softSkills?: string[];
}

export interface ExistingSearchData {
  id: string;
  query: string;
  sources: string[];
  jobId?: string;
  filters?: HuntingSearchFilters;
  maxResults?: number;
  desiredCount?: number;
  minScore?: number;
}

interface HuntingSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: (params: {
    query: string;
    sources: string[];
    jobId?: string;
    maxResults?: number;
    desiredCount?: number;
    minScore?: number;
    filters?: HuntingSearchFilters;
    existingSearchId?: string;
  }) => Promise<void>;
  jobs?: Array<{ 
    id: string; 
    title: string; 
    location?: string | null;
    job_descriptions?: {
      required_skills?: string[] | null;
      desired_skills?: string[] | null;
    } | null;
  }>;
  isLoading?: boolean;
  existingSearch?: ExistingSearchData;
  useSmartSearch?: boolean;
}

const SOURCES = [
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { id: 'github', label: 'GitHub', icon: Github },
  { id: 'instagram', label: 'Instagram', icon: Instagram },
  { id: 'portfolio', label: 'Portfólios', icon: Globe },
];

const SENIORITY_OPTIONS = [
  { value: 'junior', label: 'Júnior' },
  { value: 'pleno', label: 'Pleno' },
  { value: 'senior', label: 'Sênior' },
  { value: 'lead', label: 'Lead / Tech Lead' },
  { value: 'manager', label: 'Gerente / Manager' },
  { value: 'director', label: 'Diretor / C-Level' },
];

const MAX_RESULTS_OPTIONS = [
  { value: '5', label: '5 perfis' },
  { value: '10', label: '10 perfis' },
  { value: '15', label: '15 perfis' },
  { value: '20', label: '20 perfis' },
  { value: '30', label: '30 perfis' },
];

const WORK_MODEL_OPTIONS = [
  { value: 'remoto', label: 'Remoto' },
  { value: 'hibrido', label: 'Híbrido' },
  { value: 'presencial', label: 'Presencial' },
];

const RADIUS_OPTIONS = [
  { value: '10', label: '10 km' },
  { value: '25', label: '25 km' },
  { value: '50', label: '50 km' },
  { value: '100', label: '100 km' },
  { value: '0', label: 'Qualquer' },
];

const BR_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO',
];

function TagsInput({ 
  value, 
  onChange, 
  placeholder,
  maxTags,
}: { 
  value: string[]; 
  onChange: (tags: string[]) => void; 
  placeholder: string;
  maxTags?: number;
}) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      const newTag = input.trim().replace(/,+$/, '');
      if (newTag && !value.includes(newTag)) {
        if (maxTags && value.length >= maxTags) return;
        onChange([...value, newTag]);
      }
      setInput('');
    }
    if (e.key === 'Backspace' && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 min-h-[40px]">
      {value.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1 text-xs">
          {tag}
          <button type="button" onClick={() => removeTag(tag)} className="ml-0.5 hover:text-destructive">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : (maxTags && value.length >= maxTags ? `Máx. ${maxTags}` : '')}
        className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        disabled={maxTags ? value.length >= maxTags : false}
      />
    </div>
  );
}

export function HuntingSearchDialog({
  open,
  onOpenChange,
  onSearch,
  jobs = [],
  isLoading = false,
  existingSearch,
  useSmartSearch = true,
}: HuntingSearchDialogProps) {
  const isRefineMode = !!existingSearch;
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>(['linkedin']);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [maxResults, setMaxResults] = useState('10');
  const [location, setLocation] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationState, setLocationState] = useState('');
  const [locationRadius, setLocationRadius] = useState('50');
  const [seniority, setSeniority] = useState('');
  const [mandatorySkills, setMandatorySkills] = useState<string[]>([]);
  const [niceToHaveSkills, setNiceToHaveSkills] = useState<string[]>([]);
  const [targetCompanies, setTargetCompanies] = useState<string[]>([]);
  const [negativeKeywords, setNegativeKeywords] = useState<string[]>([]);
  const [experienceMin, setExperienceMin] = useState('');
  const [experienceMax, setExperienceMax] = useState('');
  const [industry, setIndustry] = useState('');
  const [searchMode, setSearchMode] = useState<'simple' | 'boolean'>('simple');
  const [advancedOpen, setAdvancedOpen] = useState(true);
  const [minScore, setMinScore] = useState('70');

  // New fields
  const [titleVariations, setTitleVariations] = useState<string[]>([]);
  const [manualVariation, setManualVariation] = useState('');
  const [isGeneratingVariations, setIsGeneratingVariations] = useState(false);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [companySuggestions, setCompanySuggestions] = useState<Array<{ name: string; reason: string }>>([]);
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);
  const [qualificationOpen, setQualificationOpen] = useState(false);
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [workModel, setWorkModel] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [softSkills, setSoftSkills] = useState<string[]>([]);
  const [locationError, setLocationError] = useState(false);

  const navigate = useNavigate();

  // Fetch ICP when a job is selected
  const { icp } = useJobICP(selectedJobId && selectedJobId !== 'none' ? selectedJobId : undefined);
  const { account } = useAccount();

  // Derive JD status for the selected job
  const selectedJob = selectedJobId && selectedJobId !== 'none' ? jobs.find(j => j.id === selectedJobId) : null;
  const hasJD = !!(selectedJob?.job_descriptions?.required_skills?.length || selectedJob?.job_descriptions?.desired_skills?.length);
  const hasIcpData = !!icp;

  // Generate title variations via AI
  const generateTitleVariations = useCallback(async () => {
    if (!query.trim() || query.trim().length < 2) return;
    setIsGeneratingVariations(true);
    try {
      const { data, error } = await supabase.functions.invoke('hunting-generate-title-variations', {
        body: { title: query.trim(), industry: industry || undefined, account_id: account?.id },
      });
      if (error) throw error;
      if (data?.success && data.variations?.length > 0) {
        setTitleVariations(data.variations);
        toast({ title: 'Variações geradas', description: `${data.variations.length} variações de cargo identificadas` });
      } else {
        toast({ title: 'Sem variações', description: 'Não foi possível gerar variações para este cargo', variant: 'destructive' });
      }
    } catch (err: any) {
      console.error('Error generating title variations:', err);
      toast({ title: 'Erro', description: 'Falha ao gerar variações de cargo', variant: 'destructive' });
    } finally {
      setIsGeneratingVariations(false);
    }
  }, [query, industry, toast, account?.id]);

  // Suggest target companies via AI
  const suggestCompanies = useCallback(async () => {
    if (!query.trim()) return;
    setIsLoadingCompanies(true);
    setShowCompanySuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('hunting-suggest-companies', {
        body: { title: query.trim(), industry: industry || undefined, location: location || undefined, account_id: account?.id },
      });
      if (error) throw error;
      if (data?.success && data.companies?.length > 0) {
        // Filter out companies already in the list
        const filtered = data.companies.filter(
          (c: any) => !targetCompanies.includes(c.name)
        );
        setCompanySuggestions(filtered);
      } else {
        toast({ title: 'Sem sugestões', description: 'Não foi possível sugerir empresas', variant: 'destructive' });
        setShowCompanySuggestions(false);
      }
    } catch (err: any) {
      console.error('Error suggesting companies:', err);
      toast({ title: 'Erro', description: 'Falha ao sugerir empresas', variant: 'destructive' });
      setShowCompanySuggestions(false);
    } finally {
      setIsLoadingCompanies(false);
    }
  }, [query, industry, location, targetCompanies, toast, account?.id]);

  const addSuggestedCompany = (name: string) => {
    if (!targetCompanies.includes(name)) {
      setTargetCompanies(prev => [...prev, name]);
    }
    setCompanySuggestions(prev => prev.filter(c => c.name !== name));
  };

  const addAllSuggestedCompanies = () => {
    const newCompanies = companySuggestions
      .map(c => c.name)
      .filter(name => !targetCompanies.includes(name));
    setTargetCompanies(prev => [...prev, ...newCompanies]);
    setCompanySuggestions([]);
    setShowCompanySuggestions(false);
  };

  // Auto-fill from job + JD when job is selected (skip in refine mode)
  useEffect(() => {
    if (isRefineMode) return;
    if (selectedJobId && selectedJobId !== 'none') {
      const job = jobs.find(j => j.id === selectedJobId);
      if (job) {
        setQuery(job.title);
        if (job.location) {
          setLocation(job.location);
          const parts = job.location.split(',').map((p: string) => p.trim());
          if (parts[0]) setLocationCity(parts[0]);
          if (parts[1]) setLocationState(parts[1]);
        }

        // Pre-fill skills from Job Description
        const jd = job.job_descriptions;
        if (jd?.required_skills?.length) {
          setMandatorySkills(jd.required_skills);
        }
        if (jd?.desired_skills?.length) {
          setNiceToHaveSkills(jd.desired_skills);
        }
      }
    }
  }, [selectedJobId, jobs, isRefineMode]);

  // Auto-fill advanced fields from ICP (skip in refine mode)
  useEffect(() => {
    if (isRefineMode) return;
    if (icp) {
      if (icp.mandatory_skills?.length > 0) {
        setMandatorySkills(icp.mandatory_skills.filter(s => s.length <= 30));
      }
      if (icp.nice_to_have?.length > 0) {
        setNiceToHaveSkills(icp.nice_to_have.filter(s => s.length <= 30));
      }
      if (icp.target_companies?.length > 0) {
        setTargetCompanies(icp.target_companies);
      }
      if (icp.negative_keywords?.length > 0) {
        setNegativeKeywords(icp.negative_keywords);
      }
      if (icp.target_locations?.length > 0) {
        const loc = icp.target_locations[0];
        setLocation(loc);
        // Parse city/state from "City, ST" format
        const parts = loc.split(',').map((p: string) => p.trim());
        if (parts[0]) setLocationCity(parts[0]);
        if (parts[1]) setLocationState(parts[1]);
      }
      if (icp.seniority) {
        setSeniority(icp.seniority);
      }
      if (icp.experience_years_min != null) {
        setExperienceMin(String(icp.experience_years_min));
      }
      if (icp.experience_years_max != null) {
        setExperienceMax(String(icp.experience_years_max));
      }
      if (icp.industry_preferences?.length > 0) {
        setIndustry(icp.industry_preferences[0]);
      }
      if (icp.target_sources?.length > 0) {
        setSelectedSources(icp.target_sources);
      }
      if (icp.target_title) {
        setQuery(icp.target_title);
      }
      if ((icp as any).title_variations?.length > 0) {
        setTitleVariations((icp as any).title_variations);
      }
      if (icp.salary_range_min != null) {
        setSalaryMin(String(icp.salary_range_min));
      }
      if (icp.salary_range_max != null) {
        setSalaryMax(String(icp.salary_range_max));
      }
    }
  }, [icp, isRefineMode]);

  // Pre-fill from existing search (refine mode)
  useEffect(() => {
    if (existingSearch && open) {
      setQuery(existingSearch.query);
      setSelectedSources(existingSearch.sources);
      if (existingSearch.jobId) setSelectedJobId(existingSearch.jobId);
      if (existingSearch.maxResults) setMaxResults(String(existingSearch.maxResults));
      if (existingSearch.desiredCount) setMaxResults(String(existingSearch.desiredCount));
      if (existingSearch.minScore) setMinScore(String(existingSearch.minScore));
      const f = existingSearch.filters;
      if (f?.location) setLocation(f.location);
      if (f?.seniority) setSeniority(f.seniority);
      if (f?.skills?.length) setMandatorySkills(f.skills);
      if (f?.niceToHaveSkills?.length) setNiceToHaveSkills(f.niceToHaveSkills);
      if (f?.targetCompanies?.length) setTargetCompanies(f.targetCompanies);
      if (f?.negativeKeywords?.length) setNegativeKeywords(f.negativeKeywords);
      if (f?.experienceMin != null) setExperienceMin(String(f.experienceMin));
      if (f?.experienceMax != null) setExperienceMax(String(f.experienceMax));
      if (f?.industry) setIndustry(f.industry);
      if (f?.titleVariations?.length) setTitleVariations(f.titleVariations);
      if (f?.salaryMin != null) setSalaryMin(String(f.salaryMin));
      if (f?.salaryMax != null) setSalaryMax(String(f.salaryMax));
      if (f?.workModel) setWorkModel(f.workModel);
      if (f?.languages?.length) setLanguages(f.languages);
      if (f?.softSkills?.length) setSoftSkills(f.softSkills);
    }
  }, [existingSearch, open]);

  const handleSourceToggle = (sourceId: string) => {
    setSelectedSources((prev) =>
      prev.includes(sourceId)
        ? prev.filter((s) => s !== sourceId)
        : [...prev, sourceId]
    );
  };

  const handleBooleanQueryGenerated = (booleanQuery: string) => {
    setQuery(booleanQuery);
  };

  const resetForm = () => {
    setQuery('');
    setSelectedJobId('');
    setMaxResults('10');
    setMinScore('70');
    setLocation('');
    setLocationCity('');
    setLocationState('');
    setLocationRadius('50');
    setSeniority('');
    setMandatorySkills([]);
    setNiceToHaveSkills([]);
    setTargetCompanies([]);
    setNegativeKeywords([]);
    setExperienceMin('');
    setExperienceMax('');
    setIndustry('');
    setTitleVariations([]);
    setSalaryMin('');
    setSalaryMax('');
    setWorkModel('');
    setLanguages([]);
    setSoftSkills([]);
    setCompanySuggestions([]);
    setShowCompanySuggestions(false);
  };

  const needsLocation = workModel === 'hibrido' || workModel === 'presencial';

  const handleSubmit = async () => {
    if (!query.trim() || selectedSources.length === 0) return;

    if (needsLocation && !locationCity.trim()) {
      setLocationError(true);
      toast({ title: "Localização obrigatória", description: "Para vagas híbridas ou presenciais, informe a cidade.", variant: "destructive" });
      return;
    }

    await onSearch({
      query: query.trim(),
      sources: selectedSources,
      jobId: selectedJobId === 'none' ? undefined : selectedJobId || undefined,
      maxResults: parseInt(maxResults),
      desiredCount: useSmartSearch ? parseInt(maxResults) : undefined,
      minScore: useSmartSearch ? parseInt(minScore) : undefined,
      filters: {
        location: location || undefined,
        locationCity: locationCity || undefined,
        locationState: locationState || undefined,
        locationRadius: locationRadius ? parseInt(locationRadius) : undefined,
        seniority: seniority === 'none' ? undefined : seniority || undefined,
        skills: mandatorySkills.length > 0 ? mandatorySkills : undefined,
        niceToHaveSkills: niceToHaveSkills.length > 0 ? niceToHaveSkills : undefined,
        targetCompanies: targetCompanies.length > 0 ? targetCompanies : undefined,
        negativeKeywords: negativeKeywords.length > 0 ? negativeKeywords : undefined,
        experienceMin: experienceMin ? parseInt(experienceMin) : undefined,
        experienceMax: experienceMax ? parseInt(experienceMax) : undefined,
        industry: industry || undefined,
        titleVariations: titleVariations.length > 0 ? titleVariations : undefined,
        salaryMin: salaryMin ? parseInt(salaryMin) : undefined,
        salaryMax: salaryMax ? parseInt(salaryMax) : undefined,
        workModel: workModel || undefined,
        languages: languages.length > 0 ? languages : undefined,
        softSkills: softSkills.length > 0 ? softSkills : undefined,
      },
      existingSearchId: existingSearch?.id,
    });

    if (!isRefineMode) resetForm();
    onOpenChange(false);
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <div>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              {isRefineMode ? 'Refinar Busca' : 'Nova Busca de Candidatos'}
            </DialogTitle>
            <DialogDescription>
              {isRefineMode
                ? 'Ajuste os parâmetros e busque mais candidatos. Os novos resultados serão adicionados à mesma busca.'
                : 'Busque candidatos em LinkedIn, GitHub, Instagram e portfólios públicos.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* === SECTION 1: Essential === */}

            {/* Job selector */}
            <div className="space-y-2">
              <Label>Vaga vinculada</Label>
              {jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma vaga ativa ou publicada. Crie uma vaga primeiro.
                </p>
              ) : (
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma vaga (recomendado)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Busca personalizada</SelectItem>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title} {job.location && `(${job.location})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {hasIcpData && (
                <p className="text-xs text-primary flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  ICP detectado — campos avançados preenchidos automaticamente
                </p>
              )}
            </div>

            {/* Contextual alerts based on JD/ICP status */}
            {(!selectedJobId || selectedJobId === 'none') && jobs.length > 0 && (
              <Alert className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                <AlertDescription className="text-sm text-yellow-800 dark:text-yellow-200">
                  Selecione uma vaga para buscar candidatos mais relevantes. Sem vaga vinculada, a busca usará apenas os filtros manuais.
                </AlertDescription>
              </Alert>
            )}

            {selectedJob && !hasJD && (
              <Alert className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
                <FileText className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                <AlertDescription className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center justify-between gap-2">
                  <span>A vaga não possui Job Description preenchido. Preencha o JD para que skills e requisitos sejam usados automaticamente.</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs border-yellow-500/50 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/atracao-contratacao/recrutamento/vagas/${selectedJobId}/descricao`);
                    }}
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Preencher JD
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {selectedJob && hasJD && !hasIcpData && (
              <Alert className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-500" />
                <AlertDescription className="text-sm text-blue-800 dark:text-blue-200 flex items-center justify-between gap-2">
                  <span>O ICP (Perfil Ideal) ainda não foi configurado. Com o ICP, a busca será mais precisa.</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs border-blue-500/50 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/atracao-contratacao/recrutamento/vagas/${selectedJobId}/icp`);
                    }}
                  >
                    <Target className="h-3 w-3 mr-1" />
                    Configurar ICP
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Search mode tabs */}
            <Tabs value={searchMode} onValueChange={(v) => setSearchMode(v as 'simple' | 'boolean')}>
              <TabsList className="w-full">
                <TabsTrigger value="simple" className="flex-1 gap-1">
                  <Search className="h-3.5 w-3.5" />
                  Busca Simples
                </TabsTrigger>
                <TabsTrigger value="boolean" className="flex-1 gap-1">
                  <Code2 className="h-3.5 w-3.5" />
                  Busca Booleana
                </TabsTrigger>
              </TabsList>

              <TabsContent value="simple" className="space-y-3 mt-3">
                {/* Cargo + Generate Variations Button */}
                <div className="space-y-2">
                  <Label htmlFor="query">Cargo / Título alvo *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="query"
                      placeholder="Ex: Desenvolvedor Python, Product Manager"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      required
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generateTitleVariations}
                      disabled={isGeneratingVariations || !query.trim()}
                      className="shrink-0 gap-1 text-xs"
                      title="Gerar variações de cargo com IA"
                    >
                      {isGeneratingVariations ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Wand2 className="h-3.5 w-3.5" />
                      )}
                      Variações
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O cargo é o núcleo da busca — gere variações para ampliar os resultados
                  </p>
                </div>

                {/* Manual variation input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite uma variação de cargo..."
                    value={manualVariation}
                    onChange={(e) => setManualVariation(e.target.value)}
                    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = manualVariation.trim();
                        if (val && !titleVariations.includes(val)) {
                          setTitleVariations(prev => [...prev, val]);
                        }
                        setManualVariation('');
                      }
                    }}
                    className="h-8 text-sm"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 shrink-0"
                    onClick={() => {
                      const val = manualVariation.trim();
                      if (val && !titleVariations.includes(val)) {
                        setTitleVariations(prev => [...prev, val]);
                      }
                      setManualVariation('');
                    }}
                  >
                    Adicionar
                  </Button>
                </div>

                {/* Title Variations Tags */}
                {titleVariations.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Variações de cargo ({titleVariations.length}) — usadas com OR nas buscas
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {titleVariations.map((variation) => (
                        <Badge key={variation} variant="outline" className="gap-1 text-xs bg-primary/5 border-primary/20">
                          {variation}
                          <button
                            type="button"
                            onClick={() => setTitleVariations(prev => prev.filter(v => v !== variation))}
                            className="ml-0.5 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="boolean" className="mt-3">
                <BooleanSearchBuilder
                  onQueryGenerated={handleBooleanQueryGenerated}
                  initialQuery={query}
                />
              </TabsContent>
            </Tabs>

            {/* Sources + Max results row */}
            <div className="space-y-2">
              <Label>Fontes de busca *</Label>
              <div className="flex flex-wrap gap-3">
                {SOURCES.map((source) => {
                  const Icon = source.icon;
                  const isSelected = selectedSources.includes(source.id);
                  return (
                    <label
                      key={source.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleSourceToggle(source.id)}
                        className="hidden"
                      />
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{source.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Max results + Min score */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Candidatos qualificados desejados *</Label>
                <Select value={maxResults} onValueChange={setMaxResults}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MAX_RESULTS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {useSmartSearch && (
                <div className="space-y-2">
                  <Label>Score mínimo de match *</Label>
                  <Select value={minScore} onValueChange={setMinScore}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50% (amplo)</SelectItem>
                      <SelectItem value="60">60% (moderado)</SelectItem>
                      <SelectItem value="70">70% (recomendado)</SelectItem>
                      <SelectItem value="80">80% (rigoroso)</SelectItem>
                      <SelectItem value="90">90% (muito rigoroso)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {useSmartSearch
                ? 'A busca inteligente analisa e rankeia perfis automaticamente até encontrar a quantidade desejada com o score mínimo.'
                : 'Mais perfis = mais créditos consumidos'}
            </p>

            {/* === SECTION A: Search Fields === */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between px-2 py-1.5 h-auto text-sm font-medium text-muted-foreground hover:text-foreground">
                  <span className="flex items-center gap-1.5">
                    <Search className="h-3.5 w-3.5" />
                    Campos de busca
                  </span>
                  {advancedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                {/* Location (City + State + Radius) + Seniority */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="locationCity">
                      Cidade {needsLocation && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      id="locationCity"
                      placeholder="Ex: São Paulo"
                      value={locationCity}
                      className={locationError ? 'border-destructive' : ''}
                      onChange={(e) => {
                        setLocationCity(e.target.value);
                        if (e.target.value.trim()) setLocationError(false);
                        // Keep legacy location in sync
                        const state = locationState || '';
                        setLocation(e.target.value ? `${e.target.value}${state ? `, ${state}` : ''}` : '');
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select value={locationState} onValueChange={(v) => {
                      setLocationState(v === 'none' ? '' : v);
                      if (locationCity) {
                        setLocation(`${locationCity}${v && v !== 'none' ? `, ${v}` : ''}`);
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Qualquer</SelectItem>
                        {BR_STATES.map((st) => (
                          <SelectItem key={st} value={st}>{st}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Raio</Label>
                    <Select value={locationRadius} onValueChange={setLocationRadius}>
                      <SelectTrigger>
                        <SelectValue placeholder="50 km" />
                      </SelectTrigger>
                      <SelectContent>
                        {RADIUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Senioridade</Label>
                    <Select value={seniority} onValueChange={setSeniority}>
                      <SelectTrigger>
                        <SelectValue placeholder="Qualquer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Qualquer</SelectItem>
                        {SENIORITY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Mandatory skills (max 5) */}
                <div className="space-y-2">
                  <Label>Skills obrigatórias <span className="text-xs text-muted-foreground">(máx. 5 — peso 40% no scoring)</span></Label>
                  <TagsInput
                    value={mandatorySkills}
                    onChange={setMandatorySkills}
                    placeholder="Digite e pressione Enter (ex: React, Python)"
                    maxTags={5}
                  />
                </div>

                {/* Nice-to-have skills */}
                <div className="space-y-2">
                  <Label>Skills desejáveis <span className="text-xs text-muted-foreground">(peso 20% no scoring)</span></Label>
                  <TagsInput
                    value={niceToHaveSkills}
                    onChange={setNiceToHaveSkills}
                    placeholder="Digite e pressione Enter (ex: Docker, AWS)"
                  />
                </div>

                {/* Target companies with AI suggest button */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Empresas-alvo <span className="text-xs text-muted-foreground">(bônus no scoring)</span></Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={suggestCompanies}
                      disabled={isLoadingCompanies || !query.trim()}
                      className="h-6 px-2 text-xs gap-1 text-primary hover:text-primary"
                    >
                      {isLoadingCompanies ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Building2 className="h-3 w-3" />
                      )}
                      Sugerir com IA
                    </Button>
                  </div>
                  <TagsInput
                    value={targetCompanies}
                    onChange={setTargetCompanies}
                    placeholder="Digite e pressione Enter (ex: Google, Nubank)"
                  />

                  {/* Company suggestions panel */}
                  {showCompanySuggestions && companySuggestions.length > 0 && (
                    <div className="border rounded-md p-3 space-y-2 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          Sugestões da IA ({companySuggestions.length})
                        </span>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={addAllSuggestedCompanies}
                            className="h-6 px-2 text-xs"
                          >
                            Adicionar todas
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowCompanySuggestions(false)}
                            className="h-6 px-1"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1 max-h-[160px] overflow-y-auto">
                        {companySuggestions.map((company) => (
                          <button
                            key={company.name}
                            type="button"
                            onClick={() => addSuggestedCompany(company.name)}
                            className="flex items-start gap-2 w-full text-left px-2 py-1.5 rounded hover:bg-accent/50 transition-colors group"
                          >
                            <Check className="h-3.5 w-3.5 mt-0.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            <div className="min-w-0">
                              <span className="text-sm font-medium">{company.name}</span>
                              <p className="text-xs text-muted-foreground truncate">{company.reason}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Negative keywords */}
                <div className="space-y-2">
                  <Label>Keywords negativas <span className="text-xs text-muted-foreground">(excluir da busca)</span></Label>
                  <TagsInput
                    value={negativeKeywords}
                    onChange={setNegativeKeywords}
                    placeholder="Digite e pressione Enter (ex: estagiário, freelancer)"
                  />
                </div>

                {/* Experience range + Industry */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Exp. mínima (anos)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={experienceMin}
                      onChange={(e) => setExperienceMin(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Exp. máxima (anos)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="20"
                      value={experienceMax}
                      onChange={(e) => setExperienceMax(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Setor / Indústria</Label>
                    <Input
                      placeholder="Ex: Fintech, SaaS"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* === SECTION B: Qualification Fields (Category B) === */}
            <Collapsible open={qualificationOpen} onOpenChange={setQualificationOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between px-2 py-1.5 h-auto text-sm font-medium text-muted-foreground hover:text-foreground">
                  <span className="flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5" />
                    Qualificação <span className="text-xs font-normal">(não afeta a busca)</span>
                  </span>
                  {qualificationOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                <p className="text-xs text-muted-foreground">
                  Esses campos são usados para qualificar candidatos depois de encontrados — não afetam as queries de busca.
                </p>

                {/* Salary range + Work model */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Salário mín. (R$)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="5000"
                      value={salaryMin}
                      onChange={(e) => setSalaryMin(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Salário máx. (R$)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="15000"
                      value={salaryMax}
                      onChange={(e) => setSalaryMax(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Modelo de trabalho</Label>
                    <Select value={workModel} onValueChange={(v) => {
                      setWorkModel(v);
                      if (v !== 'hibrido' && v !== 'presencial') setLocationError(false);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Qualquer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Qualquer</SelectItem>
                        {WORK_MODEL_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Languages */}
                <div className="space-y-2">
                  <Label>Idiomas <span className="text-xs text-muted-foreground">(para qualificação)</span></Label>
                  <TagsInput
                    value={languages}
                    onChange={setLanguages}
                    placeholder="Digite e pressione Enter (ex: Inglês, Espanhol)"
                  />
                </div>

                {/* Soft skills */}
                <div className="space-y-2">
                  <Label>Soft skills / Fit cultural <span className="text-xs text-muted-foreground">(para qualificação)</span></Label>
                  <TagsInput
                    value={softSkills}
                    onChange={setSoftSkills}
                    placeholder="Digite e pressione Enter (ex: Liderança, Comunicação)"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isLoading || !query.trim() || selectedSources.length === 0}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  {isRefineMode ? `Buscar mais candidatos (${maxResults} perfis)` : `Iniciar Busca (${maxResults} perfis)`}
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
