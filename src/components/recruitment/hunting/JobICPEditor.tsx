import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Sparkles, RefreshCw, Plus, X, Target, Brain, AlertTriangle, Search, Building2, MapPin, DollarSign, Factory, ChevronDown, ChevronRight, Eye, Settings2, User, ExternalLink, Link, Briefcase, TrendingUp, Shield, Clock } from 'lucide-react';
import { useJobICP } from '@/hooks/useJobICP';
import { useDebounce } from '@/hooks/use-debounce';
import type { JobICP, Seniority, CommunicationStyle, WorkContext, TenurePenalty } from '@/types/job-icp.types';
import { COMPANY_SIZE_OPTIONS, OPENNESS_SIGNAL_OPTIONS, TENURE_PENALTY_OPTIONS } from '@/types/job-icp.types';
import { ICPSuggestionsCard } from './ICPSuggestionsCard';

interface ArrayFieldProps {
  label: string;
  icon: any;
  items: string[];
  value: string;
  setter: (v: string) => void;
  onAdd: () => void;
  onRemove: (item: string) => void;
  placeholder: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  isUpdating?: boolean;
  description?: string;
}

const ArrayField = ({ label, icon: Icon, items, value, setter, onAdd, onRemove, placeholder, variant = 'outline', isUpdating, description }: ArrayFieldProps) => (
  <div>
    <Label className="flex items-center gap-2">
      <Icon className="h-4 w-4" />
      {label}
    </Label>
    {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
    <div className="flex flex-wrap gap-2 mt-2">
      {items.map((item) => (
        <Badge key={item} variant={variant} className="pr-1">
          {item}
          <button
            onClick={() => onRemove(item)}
            className="ml-1 hover:bg-muted rounded-full p-0.5"
            disabled={isUpdating}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
    <div className="flex gap-2 mt-2">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => setter(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAdd(); } }}
        disabled={isUpdating}
      />
      <Button size="icon" variant="outline" onClick={onAdd} disabled={isUpdating}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  </div>
);

interface JobICPEditorProps {
  jobId: string;
  jobTitle?: string;
  compact?: boolean;
}

const SENIORITY_OPTIONS: { value: Seniority; label: string }[] = [
  { value: 'junior', label: 'Júnior' },
  { value: 'pleno', label: 'Pleno' },
  { value: 'senior', label: 'Sênior' },
  { value: 'lead', label: 'Lead' },
  { value: 'specialist', label: 'Especialista' },
];

const COMMUNICATION_OPTIONS: { value: CommunicationStyle; label: string }[] = [
  { value: 'direto', label: 'Direto' },
  { value: 'colaborativo', label: 'Colaborativo' },
  { value: 'formal', label: 'Formal' },
];

const WORK_CONTEXT_OPTIONS: { value: WorkContext; label: string }[] = [
  { value: 'remoto', label: 'Remoto' },
  { value: 'hibrido', label: 'Híbrido' },
  { value: 'presencial', label: 'Presencial' },
];

function SectionHeader({ icon: Icon, title, count, isOpen, onToggle }: { icon: any; title: string; count?: number; isOpen: boolean; onToggle: () => void }) {
  return (
    <CollapsibleTrigger asChild onClick={onToggle}>
      <button className="flex items-center justify-between w-full py-2 text-sm font-semibold text-foreground hover:text-primary transition-colors">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
          {count != null && count > 0 && (
            <Badge variant="secondary" className="text-xs h-5">{count}</Badge>
          )}
        </div>
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
    </CollapsibleTrigger>
  );
}

function SearchPreviewCard({ icp }: { icp: JobICP }) {
  const titleVariations = icp.title_variations || [];
  const targetCompanies = icp.target_companies || [];
  const targetLocations = icp.target_locations || [];
  const negativeKeywords = icp.negative_keywords || [];
  const companySizeRanges = icp.company_size_ranges || [];
  const excludedTitles = icp.excluded_current_titles || [];

  return (
    <Card className="bg-muted/50 border-dashed">
      <CardContent className="pt-4 pb-3 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Eye className="h-3.5 w-3.5" />
          Preview da Busca
        </div>
        <p className="text-sm text-foreground">
          A IA vai buscar <strong>{titleVariations.length > 0 ? titleVariations.slice(0, 3).join(', ') : icp.target_title || icp.role}</strong>
          {targetLocations.length > 0 && <> em <strong>{targetLocations.slice(0, 2).join(', ')}</strong></>}
          {targetCompanies.length > 0 && <> filtrando <strong>{targetCompanies.length} empresas-alvo</strong></>}
          {companySizeRanges.length > 0 && <> em empresas de <strong>{companySizeRanges.length} porte(s)</strong></>}
          {excludedTitles.length > 0 && <>, excluindo cargos: <span className="text-destructive">{excludedTitles.join(', ')}</span></>}
          {negativeKeywords.length > 0 && <>, excluindo termos: <span className="text-destructive">{negativeKeywords.join(', ')}</span></>}
          .
        </p>
        {icp.linkedin_boolean_query && (
          <div className="mt-2">
            <Label className="text-xs text-muted-foreground">Boolean Query</Label>
            <code className="block text-xs bg-background rounded p-2 mt-1 break-all">{icp.linkedin_boolean_query}</code>
          </div>
        )}
        {icp.sales_navigator_url && (
          <div className="mt-2">
            <a
              href={icp.sales_navigator_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Abrir busca no Sales Navigator
            </a>
          </div>
        )}
        <div className="flex gap-4 text-xs text-muted-foreground mt-1">
          <span>Score mín: <strong>{icp.min_hunting_score}%</strong></span>
          <span>Threshold: <strong>{icp.confidence_threshold}%</strong></span>
          {icp.scoring_weights && (
            <span>Pesos: Obrig {Math.round((icp.scoring_weights.required || 0.4) * 100)}% | Desej {Math.round((icp.scoring_weights.desired || 0.2) * 100)}%</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function JobICPEditor({ jobId, jobTitle, compact = false }: JobICPEditorProps) {
  const {
    icp,
    isLoading,
    generateICP,
    isGenerating,
    updateICP,
    isUpdating,
    updateThreshold,
    hasICP,
  } = useJobICP(jobId);

  const [newSkill, setNewSkill] = useState('');
  const [newNiceToHave, setNewNiceToHave] = useState('');
  const [newDealBreaker, setNewDealBreaker] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [newTargetCompany, setNewTargetCompany] = useState('');
  const [newTargetLocation, setNewTargetLocation] = useState('');
  const [newNegativeKeyword, setNewNegativeKeyword] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [newTitleVariation, setNewTitleVariation] = useState('');
  const [localSalesNavUrl, setLocalSalesNavUrl] = useState('');
  // NEW state for new fields
  const [newExcludedTitle, setNewExcludedTitle] = useState('');
  const [newValuedRole, setNewValuedRole] = useState('');
  const [newNegPattern, setNewNegPattern] = useState('');
  const [newRefCompany, setNewRefCompany] = useState('');

  // Section open states
  const [profileOpen, setProfileOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scoringOpen, setScoringOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Local state for text/number fields
  const [localTargetTitle, setLocalTargetTitle] = useState('');
  const [localSalaryMin, setLocalSalaryMin] = useState('');
  const [localSalaryMax, setLocalSalaryMax] = useState('');
  const [localHuntingScore, setLocalHuntingScore] = useState(50);
  const [localThreshold, setLocalThreshold] = useState(60);

  const initializedRef = useRef(false);
  const icpIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (icp && icp.id !== icpIdRef.current) {
      icpIdRef.current = icp.id;
      initializedRef.current = true;
      setLocalTargetTitle(icp.target_title || '');
      setLocalSalaryMin(icp.salary_range_min != null ? String(icp.salary_range_min) : '');
      setLocalSalaryMax(icp.salary_range_max != null ? String(icp.salary_range_max) : '');
      setLocalHuntingScore(icp.min_hunting_score);
      setLocalThreshold(icp.confidence_threshold);
      setLocalSalesNavUrl(icp.sales_navigator_url || '');
    }
  }, [icp]);

  const debouncedTargetTitle = useDebounce(localTargetTitle, 500);
  const debouncedSalaryMin = useDebounce(localSalaryMin, 500);
  const debouncedSalaryMax = useDebounce(localSalaryMax, 500);
  const debouncedHuntingScore = useDebounce(localHuntingScore, 500);
  const debouncedThreshold = useDebounce(localThreshold, 500);
  const debouncedSalesNavUrl = useDebounce(localSalesNavUrl, 800);

  useEffect(() => {
    if (!initializedRef.current || !icp) return;
    const newVal = debouncedTargetTitle || null;
    if (newVal !== (icp.target_title || null)) updateICP({ target_title: newVal });
  }, [debouncedTargetTitle]);

  useEffect(() => {
    if (!initializedRef.current || !icp) return;
    const newVal = debouncedSalaryMin ? parseInt(debouncedSalaryMin) : null;
    if (newVal !== icp.salary_range_min) updateICP({ salary_range_min: newVal });
  }, [debouncedSalaryMin]);

  useEffect(() => {
    if (!initializedRef.current || !icp) return;
    const newVal = debouncedSalaryMax ? parseInt(debouncedSalaryMax) : null;
    if (newVal !== icp.salary_range_max) updateICP({ salary_range_max: newVal });
  }, [debouncedSalaryMax]);

  useEffect(() => {
    if (!initializedRef.current || !icp) return;
    if (debouncedHuntingScore !== icp.min_hunting_score) updateICP({ min_hunting_score: debouncedHuntingScore });
  }, [debouncedHuntingScore]);

  useEffect(() => {
    if (!initializedRef.current || !icp) return;
    if (debouncedThreshold !== icp.confidence_threshold) updateThreshold(debouncedThreshold);
  }, [debouncedThreshold]);

  useEffect(() => {
    if (!initializedRef.current || !icp) return;
    const newVal = debouncedSalesNavUrl || null;
    if (newVal !== (icp.sales_navigator_url || null)) updateICP({ sales_navigator_url: newVal } as any);
  }, [debouncedSalesNavUrl]);

  const handleGenerateICP = async (regenerate = false) => {
    await generateICP({ regenerate });
  };

  const addToArray = async (field: keyof JobICP, value: string, setter: (v: string) => void) => {
    if (!value.trim() || !icp) return;
    const currentArray = (icp[field] as string[]) || [];
    if (!currentArray.includes(value.trim())) {
      await updateICP({ [field]: [...currentArray, value.trim()] } as any);
    }
    setter('');
  };

  const removeFromArray = async (field: keyof JobICP, value: string) => {
    if (!icp) return;
    const currentArray = (icp[field] as string[]) || [];
    await updateICP({ [field]: currentArray.filter((v) => v !== value) } as any);
  };

  const toggleArrayItem = async (field: keyof JobICP, value: string) => {
    if (!icp) return;
    const currentArray = ((icp as any)[field] as string[]) || [];
    if (currentArray.includes(value)) {
      await updateICP({ [field]: currentArray.filter((v) => v !== value) } as any);
    } else {
      await updateICP({ [field]: [...currentArray, value] } as any);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!hasICP) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            ICP - Perfil Ideal do Candidato
          </CardTitle>
          <CardDescription>
            Gere automaticamente o ICP estruturado a partir da descrição da vaga para orientar o hunting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => handleGenerateICP()} disabled={isGenerating} className="w-full">
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando ICP...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar ICP com IA
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              ICP: {icp.role}
            </CardTitle>
            <Badge variant="outline">{SENIORITY_OPTIONS.find(s => s.value === icp.seniority)?.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Skills Obrigatórias</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {icp.mandatory_skills.map((skill) => (
                <Badge key={skill} variant="default" className="text-xs">{skill}</Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Threshold de Match</span>
            <Badge variant="secondary">{icp.confidence_threshold}%</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  const profileFieldCount = (icp.mandatory_skills?.length || 0) + (icp.nice_to_have?.length || 0) + (icp.deal_breakers?.length || 0);
  const searchFieldCount = (icp.title_variations?.length || 0) + (icp.target_companies?.length || 0) + (icp.target_locations?.length || 0) + (icp.company_size_ranges?.length || 0) + (icp.excluded_current_titles?.length || 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              ICP - Perfil Ideal do Candidato
            </CardTitle>
            <CardDescription>
              Este perfil orienta o hunting, scoring e triagem automatizada.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => handleGenerateICP(true)} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerar
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ICP Suggestions from rejection patterns */}
        <ICPSuggestionsCard jobId={jobId} />

        {/* Search Preview Card */}
        <SearchPreviewCard icp={icp} />

        {/* ====== SECTION 1: PERFIL (obrigatório) ====== */}
        <Collapsible open={profileOpen} onOpenChange={setProfileOpen}>
          <SectionHeader icon={User} title="Perfil do Candidato" count={profileFieldCount} isOpen={profileOpen} onToggle={() => setProfileOpen(!profileOpen)} />
          <CollapsibleContent className="space-y-4 pt-2">
            {/* Core Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cargo</Label>
                <Input value={icp.role} readOnly className="bg-muted" />
              </div>
              <div>
                <Label>Senioridade</Label>
                <Select value={icp.seniority} onValueChange={(value: Seniority) => updateICP({ seniority: value })} disabled={isUpdating}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SENIORITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ArrayField
              label="Skills Obrigatórias"
              icon={Brain}
              items={icp.mandatory_skills || []}
              value={newSkill}
              setter={setNewSkill}
              onAdd={() => addToArray('mandatory_skills', newSkill, setNewSkill)}
              onRemove={(item) => removeFromArray('mandatory_skills', item)}
              placeholder="Adicionar skill obrigatória..."
              variant="default"
              isUpdating={isUpdating}
            />

            <ArrayField
              label="Skills Desejáveis"
              icon={Brain}
              items={icp.nice_to_have || []}
              value={newNiceToHave}
              setter={setNewNiceToHave}
              onAdd={() => addToArray('nice_to_have', newNiceToHave, setNewNiceToHave)}
              onRemove={(item) => removeFromArray('nice_to_have', item)}
              placeholder="Adicionar skill desejável..."
              variant="secondary"
              isUpdating={isUpdating}
            />

            <ArrayField
              label="Deal Breakers (Desqualificadores)"
              icon={AlertTriangle}
              items={icp.deal_breakers || []}
              value={newDealBreaker}
              setter={setNewDealBreaker}
              onAdd={() => addToArray('deal_breakers', newDealBreaker, setNewDealBreaker)}
              onRemove={(item) => removeFromArray('deal_breakers', item)}
              placeholder="Adicionar deal breaker..."
              variant="destructive"
              isUpdating={isUpdating}
            />

            <div>
              <Label>Contexto de Trabalho</Label>
              <Select value={icp.work_context || ''} onValueChange={(value: WorkContext) => updateICP({ work_context: value })} disabled={isUpdating}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {WORK_CONTEXT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* NEW: Trajetória de Carreira */}
            <Separator className="my-2" />
            <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Trajetória & Referências</Label>

            <ArrayField
              label="Cargos Anteriores Valorizados"
              icon={TrendingUp}
              items={(icp as any).valued_previous_roles || []}
              value={newValuedRole}
              setter={setNewValuedRole}
              onAdd={() => addToArray('valued_previous_roles' as any, newValuedRole, setNewValuedRole)}
              onRemove={(item) => removeFromArray('valued_previous_roles' as any, item)}
              placeholder="Ex: SDR, Executivo de Contas, Closer..."
              variant="outline"
              isUpdating={isUpdating}
              description="Cargos no histórico que indicam trajetória adequada (+bônus no scoring)"
            />

            <ArrayField
              label="Padrões de Trajetória a Penalizar"
              icon={AlertTriangle}
              items={(icp as any).negative_trajectory_patterns || []}
              value={newNegPattern}
              setter={setNewNegPattern}
              onAdd={() => addToArray('negative_trajectory_patterns' as any, newNegPattern, setNewNegPattern)}
              onRemove={(item) => removeFromArray('negative_trajectory_patterns' as any, item)}
              placeholder="Ex: nunca gerenciou equipe, veio apenas de consultoria..."
              variant="destructive"
              isUpdating={isUpdating}
              description="Padrões que indicam menor aderência ao perfil"
            />

            <ArrayField
              label="Empresas de Referência (bônus)"
              icon={Building2}
              items={(icp as any).reference_companies || []}
              value={newRefCompany}
              setter={setNewRefCompany}
              onAdd={() => addToArray('reference_companies' as any, newRefCompany, setNewRefCompany)}
              onRemove={(item) => removeFromArray('reference_companies' as any, item)}
              placeholder="Ex: RD Station, Nubank, iFood..."
              variant="outline"
              isUpdating={isUpdating}
              description="Empresas de referência do setor — candidatos que passaram por elas recebem bônus"
            />

            {/* Salary — marked as used in qualification */}
            <Separator className="my-2" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2"><DollarSign className="h-4 w-4" />Faixa Salarial (Mín)</Label>
                <Input type="number" min={0} placeholder="Ex: 8000" value={localSalaryMin} onChange={(e) => setLocalSalaryMin(e.target.value)} />
              </div>
              <div>
                <Label className="flex items-center gap-2"><DollarSign className="h-4 w-4" />Faixa Salarial (Máx)</Label>
                <Input type="number" min={0} placeholder="Ex: 15000" value={localSalaryMax} onChange={(e) => setLocalSalaryMax(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Usado na qualificação do candidato, não filtra a busca.</p>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* ====== SECTION 2: BUSCA ====== */}
        <Collapsible open={searchOpen} onOpenChange={setSearchOpen}>
          <SectionHeader icon={Search} title="Estratégia de Busca" count={searchFieldCount} isOpen={searchOpen} onToggle={() => setSearchOpen(!searchOpen)} />
          <CollapsibleContent className="space-y-4 pt-2">
            <div>
              <Label>Cargo-alvo para Busca</Label>
              <Input placeholder="Ex: Desenvolvedor Backend, Software Engineer..." value={localTargetTitle} onChange={(e) => setLocalTargetTitle(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Título usado na geração de queries. Se vazio, usa o cargo do ICP.</p>
            </div>

            <ArrayField
              label="Títulos e Palavras-chave de Busca"
              icon={Search}
              items={icp.title_variations || []}
              value={newTitleVariation}
              setter={setNewTitleVariation}
              onAdd={() => addToArray('title_variations', newTitleVariation, setNewTitleVariation)}
              onRemove={(item) => removeFromArray('title_variations', item)}
              placeholder="Ex: Growth Manager, Head de Growth, HubSpot..."
              variant="outline"
              isUpdating={isUpdating}
              description="Variações de título (PT/EN) e palavras-chave adicionais para a busca"
            />

            <ArrayField
              label="Empresas-alvo"
              icon={Building2}
              items={icp.target_companies || []}
              value={newTargetCompany}
              setter={setNewTargetCompany}
              onAdd={() => addToArray('target_companies', newTargetCompany, setNewTargetCompany)}
              onRemove={(item) => removeFromArray('target_companies', item)}
              placeholder="Ex: Nubank, VTEX, Stone..."
              variant="outline"
              isUpdating={isUpdating}
            />

            <ArrayField
              label="Localizações-alvo"
              icon={MapPin}
              items={icp.target_locations || []}
              value={newTargetLocation}
              setter={setNewTargetLocation}
              onAdd={() => addToArray('target_locations', newTargetLocation, setNewTargetLocation)}
              onRemove={(item) => removeFromArray('target_locations', item)}
              placeholder="Ex: São Paulo, Remoto Brasil..."
              variant="outline"
              isUpdating={isUpdating}
            />

            {/* NEW: Company Size */}
            <div>
              <Label className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Porte da Empresa
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">Filtra pelo tamanho da empresa atual do candidato</p>
              <div className="grid grid-cols-1 gap-2 mt-2">
                {COMPANY_SIZE_OPTIONS.map((opt) => {
                  const checked = ((icp as any).company_size_ranges || []).includes(opt.value);
                  return (
                    <div key={opt.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`size-${opt.value}`}
                        checked={checked}
                        onCheckedChange={() => toggleArrayItem('company_size_ranges' as any, opt.value)}
                        disabled={isUpdating}
                      />
                      <label htmlFor={`size-${opt.value}`} className="text-sm cursor-pointer">{opt.label}</label>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* NEW: Excluded Current Titles */}
            <ArrayField
              label="Cargos Atuais a Excluir"
              icon={Shield}
              items={(icp as any).excluded_current_titles || []}
              value={newExcludedTitle}
              setter={setNewExcludedTitle}
              onAdd={() => addToArray('excluded_current_titles' as any, newExcludedTitle, setNewExcludedTitle)}
              onRemove={(item) => removeFromArray('excluded_current_titles' as any, item)}
              placeholder="Ex: estagiário, assistente, freelancer..."
              variant="destructive"
              isUpdating={isUpdating}
              description="Exclui apenas se o cargo ATUAL contiver esses termos (diferente de palavras negativas gerais)"
            />

            {/* NEW: Openness Signals */}
            <div>
              <Label className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Sinais de Abertura (Sales Navigator)
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">Priorizar candidatos com sinais comportamentais de receptividade</p>
              <div className="grid grid-cols-1 gap-2 mt-2">
                {OPENNESS_SIGNAL_OPTIONS.map((opt) => {
                  const checked = ((icp as any).openness_signals || []).includes(opt.value);
                  return (
                    <div key={opt.value} className="flex items-start space-x-2">
                      <Checkbox
                        id={`signal-${opt.value}`}
                        checked={checked}
                        onCheckedChange={() => toggleArrayItem('openness_signals' as any, opt.value)}
                        disabled={isUpdating}
                        className="mt-0.5"
                      />
                      <div>
                        <label htmlFor={`signal-${opt.value}`} className="text-sm cursor-pointer font-medium">{opt.label}</label>
                        <p className="text-xs text-muted-foreground">{opt.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <ArrayField
              label="Palavras Negativas (excluir do perfil todo)"
              icon={X}
              items={icp.negative_keywords || []}
              value={newNegativeKeyword}
              setter={setNewNegativeKeyword}
              onAdd={() => addToArray('negative_keywords', newNegativeKeyword, setNewNegativeKeyword)}
              onRemove={(item) => removeFromArray('negative_keywords', item)}
              placeholder="Ex: professor, acadêmico..."
              variant="destructive"
              isUpdating={isUpdating}
              description="Exclui candidatos com essas palavras em qualquer parte do perfil"
            />

            {/* Advanced search config — collapsible */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Settings2 className="h-3 w-3" />
                  Configurações avançadas de busca
                  {advancedOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-3">
                <div>
                  <Label className="flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    URL do Sales Navigator
                  </Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="https://www.linkedin.com/sales/search/people?query=..."
                      value={localSalesNavUrl}
                      onChange={(e) => setLocalSalesNavUrl(e.target.value)}
                      disabled={isUpdating}
                      className="text-xs"
                    />
                    {localSalesNavUrl && (
                      <Button size="icon" variant="outline" asChild>
                        <a href={localSalesNavUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cole uma URL do Sales Navigator ou deixe a IA gerar automaticamente.
                  </p>
                </div>

                <div>
                  <Label>Estilo de Comunicação</Label>
                  <Select value={icp.communication_style || ''} onValueChange={(value: CommunicationStyle) => updateICP({ communication_style: value })} disabled={isUpdating}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {COMMUNICATION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Usado na mensagem de abordagem, não no scoring.</p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* ====== SECTION 3: SCORING (avançado) ====== */}
        <Collapsible open={scoringOpen} onOpenChange={setScoringOpen}>
          <SectionHeader icon={Settings2} title="Configuração de Scoring" isOpen={scoringOpen} onToggle={() => setScoringOpen(!scoringOpen)} />
          <CollapsibleContent className="space-y-4 pt-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Score Mínimo para Hunting</Label>
                <Badge variant="secondary">{localHuntingScore}%</Badge>
              </div>
              <Slider value={[localHuntingScore]} min={0} max={100} step={5} onValueChange={([value]) => setLocalHuntingScore(value)} />
              <p className="text-xs text-muted-foreground">
                Candidatos com score abaixo de {localHuntingScore}% serão descartados automaticamente.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Threshold de Match para Abordagem</Label>
                <Badge variant="secondary">{localThreshold}%</Badge>
              </div>
              <Slider value={[localThreshold]} min={0} max={100} step={5} onValueChange={([value]) => setLocalThreshold(value)} />
              <p className="text-xs text-muted-foreground">
                Apenas candidatos com score ≥ {localThreshold}% serão recomendados para abordagem.
              </p>
            </div>

            {icp.scoring_weights && (
              <div className="rounded-lg border p-3 space-y-2">
                <Label className="text-xs text-muted-foreground">Pesos do Scoring (gerados pela IA)</Label>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div>
                    <div className="font-semibold text-lg">{Math.round((icp.scoring_weights.required || 0.4) * 100)}%</div>
                    <div className="text-muted-foreground">Obrigatórias</div>
                  </div>
                  <div>
                    <div className="font-semibold text-lg">{Math.round((icp.scoring_weights.desired || 0.2) * 100)}%</div>
                    <div className="text-muted-foreground">Desejáveis</div>
                  </div>
                  <div>
                    <div className="font-semibold text-lg">{Math.round((icp.scoring_weights.experience || 0.2) * 100)}%</div>
                    <div className="text-muted-foreground">Experiência</div>
                  </div>
                  <div>
                    <div className="font-semibold text-lg">{Math.round((icp.scoring_weights.culture || 0.2) * 100)}%</div>
                    <div className="text-muted-foreground">Cultural</div>
                  </div>
                </div>
              </div>
            )}

            {/* Setores — now in scoring section as bonus */}
            <ArrayField
              label="Setores Preferidos (bônus no scoring)"
              icon={Factory}
              items={icp.industry_preferences || []}
              value={newIndustry}
              setter={setNewIndustry}
              onAdd={() => addToArray('industry_preferences', newIndustry, setNewIndustry)}
              onRemove={(item) => removeFromArray('industry_preferences', item)}
              placeholder="Ex: Fintech, SaaS, E-commerce..."
              variant="outline"
              isUpdating={isUpdating}
              description="Candidatos do mesmo setor recebem bônus — não filtra a busca"
            />

            {/* NEW: Tenure config */}
            <Separator className="my-2" />
            <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Estabilidade de Carreira
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tempo mínimo em cargos (meses)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Ex: 12"
                  value={(icp as any).tenure_min_months != null ? String((icp as any).tenure_min_months) : ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value) : null;
                    updateICP({ tenure_min_months: val } as any);
                  }}
                  disabled={isUpdating}
                />
                <p className="text-xs text-muted-foreground mt-1">Vazio = não avaliar</p>
              </div>
              <div>
                <Label>Ação para job hoppers</Label>
                <Select
                  value={(icp as any).tenure_penalty || 'ignore'}
                  onValueChange={(value: TenurePenalty) => updateICP({ tenure_penalty: value } as any)}
                  disabled={isUpdating}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TENURE_PENALTY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
          <span>
            Gerado por: {icp.generated_by === 'ai' ? 'IA' : 'Manual'} • Versão: {icp.version}
          </span>
          <span>Atualizado em: {new Date(icp.updated_at).toLocaleDateString('pt-BR')}</span>
        </div>
      </CardContent>
    </Card>
  );
}
