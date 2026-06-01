import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, X, Upload, User, Users, AlertCircle, CheckCircle2, Briefcase, Building2, Target, TrendingUp, GitBranch } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { OrgChartNode, NodePerson, VacancyStatus, NodeType } from '@/types/org-chart.types';

const NODE_TYPES: { value: NodeType; label: string; icon: React.ReactNode }[] = [
  { value: 'cargo', label: 'Cargo', icon: <Briefcase className="h-4 w-4" /> },
  { value: 'diretoria', label: 'Diretoria', icon: <Building2 className="h-4 w-4" /> },
  { value: 'gerencia', label: 'Gerência', icon: <Building2 className="h-4 w-4" /> },
  { value: 'coordenacao', label: 'Coordenação', icon: <Target className="h-4 w-4" /> },
  { value: 'time', label: 'Time', icon: <Users className="h-4 w-4" /> },
  { value: 'squad', label: 'Squad', icon: <Users className="h-4 w-4" /> },
];

const MATURITY_LABELS = ['Inicial', 'Básico', 'Definido', 'Gerenciado', 'Otimizado'];

interface NodeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (title: string, personName?: string, roles?: string[], personAvatar?: string, people?: NodePerson[], vacancyStatus?: VacancyStatus) => void;
  onUpdate?: (updates: Partial<Pick<OrgChartNode, 'title' | 'person_name' | 'roles' | 'person_avatar' | 'people' | 'vacancy_status' | 'node_type' | 'maturity_level' | 'capacity_score' | 'key_competencies' | 'competency_gaps'>>) => void;
  editingNode?: OrgChartNode | null;
  mode?: 'create' | 'edit';
  allNodes?: OrgChartNode[];
  onMoveNode?: (nodeId: string, newParentId: string | null) => Promise<void>;
  portalContainer?: HTMLElement | null;
}

export function NodeForm({
  open,
  onOpenChange,
  onSubmit,
  onUpdate,
  editingNode,
  mode = 'create',
  allNodes = [],
  onMoveNode,
  portalContainer,
}: NodeFormProps) {
  // Basic fields
  const [title, setTitle] = useState('');
  const [people, setPeople] = useState<NodePerson[]>([{ name: '', avatar: null }]);
  const [roles, setRoles] = useState<string[]>([]);
  const [newRole, setNewRole] = useState('');
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [vacancyStatus, setVacancyStatus] = useState<VacancyStatus>('active');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  
  // Organization fields
  const [nodeType, setNodeType] = useState<NodeType>('cargo');
  const [maturityLevel, setMaturityLevel] = useState<number>(3);
  const [capacityScore, setCapacityScore] = useState<number>(50);
  const [keyCompetencies, setKeyCompetencies] = useState<string[]>([]);
  const [newCompetency, setNewCompetency] = useState('');
  const [competencyGaps, setCompetencyGaps] = useState<string[]>([]);
  const [newGap, setNewGap] = useState('');
  
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Get descendant IDs to exclude from parent selector
  const getDescendantIds = (nodeId: string): string[] => {
    const children = allNodes.filter(n => n.parent_id === nodeId);
    return children.flatMap(child => [child.id, ...getDescendantIds(child.id)]);
  };

  const availableParents = useMemo(() => {
    if (!editingNode || mode !== 'edit') return [];
    const excludeIds = new Set([editingNode.id, ...getDescendantIds(editingNode.id)]);
    return allNodes.filter(n => !excludeIds.has(n.id));
  }, [editingNode, allNodes, mode]);

  useEffect(() => {
    if (editingNode && mode === 'edit') {
      setTitle(editingNode.title);
      setRoles(editingNode.roles || []);
      setVacancyStatus(editingNode.vacancy_status || 'active');
      setNodeType(editingNode.node_type || 'cargo');
      setMaturityLevel(editingNode.maturity_level || 3);
      setCapacityScore(editingNode.capacity_score || 50);
      setKeyCompetencies(editingNode.key_competencies || []);
      setCompetencyGaps(editingNode.competency_gaps || []);
      setSelectedParentId(editingNode.parent_id);
      
      // Migrate from old single person to people array
      if (editingNode.people && editingNode.people.length > 0) {
        setPeople(editingNode.people);
      } else if (editingNode.person_name) {
        setPeople([{ name: editingNode.person_name, avatar: editingNode.person_avatar }]);
      } else {
        setPeople([{ name: '', avatar: null }]);
      }
    } else {
      setTitle('');
      setPeople([{ name: '', avatar: null }]);
      setRoles([]);
      setVacancyStatus('active');
      setNodeType('cargo');
      setMaturityLevel(3);
      setCapacityScore(50);
      setKeyCompetencies([]);
      setCompetencyGaps([]);
      setSelectedParentId(null);
    }
    setNewRole('');
    setNewCompetency('');
    setNewGap('');
  }, [editingNode, open, mode]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }

    setUploadingIndex(index);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `org-chart/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setPeople(prev => prev.map((p, i) => i === index ? { ...p, avatar: publicUrl } : p));
      toast.success('Foto enviada com sucesso');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar foto');
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleAddPerson = () => {
    if (people.length < 20) {
      setPeople(prev => [...prev, { name: '', avatar: null }]);
    }
  };

  const handleRemovePerson = (index: number) => {
    if (people.length > 1) {
      setPeople(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handlePersonNameChange = (index: number, name: string) => {
    setPeople(prev => prev.map((p, i) => i === index ? { ...p, name } : p));
  };

  const handleRemoveAvatar = (index: number) => {
    setPeople(prev => prev.map((p, i) => i === index ? { ...p, avatar: null } : p));
  };

  const handleAddRole = () => {
    if (newRole.trim() && !roles.includes(newRole.trim())) {
      setRoles(prev => [...prev, newRole.trim()]);
      setNewRole('');
    }
  };

  const handleRemoveRole = (role: string) => {
    setRoles(prev => prev.filter(r => r !== role));
  };

  const handleAddCompetency = () => {
    if (newCompetency.trim() && !keyCompetencies.includes(newCompetency.trim())) {
      setKeyCompetencies(prev => [...prev, newCompetency.trim()]);
      setNewCompetency('');
    }
  };

  const handleRemoveCompetency = (comp: string) => {
    setKeyCompetencies(prev => prev.filter(c => c !== comp));
  };

  const handleAddGap = () => {
    if (newGap.trim() && !competencyGaps.includes(newGap.trim())) {
      setCompetencyGaps(prev => [...prev, newGap.trim()]);
      setNewGap('');
    }
  };

  const handleRemoveGap = (gap: string) => {
    setCompetencyGaps(prev => prev.filter(g => g !== gap));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const validPeople = people.filter(p => p.name.trim());
    const firstPerson = validPeople[0];

    if (mode === 'edit' && onUpdate) {
      // Check if parent changed and move node
      if (editingNode && onMoveNode && selectedParentId !== editingNode.parent_id) {
        await onMoveNode(editingNode.id, selectedParentId);
      }
      onUpdate({
        title,
        person_name: firstPerson?.name || null,
        person_avatar: firstPerson?.avatar || null,
        roles,
        people: validPeople.length > 0 ? validPeople : null,
        vacancy_status: vacancyStatus,
        node_type: nodeType,
        maturity_level: maturityLevel,
        capacity_score: capacityScore,
        key_competencies: keyCompetencies.length > 0 ? keyCompetencies : null,
        competency_gaps: competencyGaps.length > 0 ? competencyGaps : null,
      });
    } else {
      onSubmit(
        title, 
        firstPerson?.name, 
        roles.length > 0 ? roles : undefined, 
        firstPerson?.avatar || undefined,
        validPeople.length > 0 ? validPeople : undefined,
        vacancyStatus
      );
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl" container={portalContainer}>
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Editar Cargo' : 'Novo Cargo'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info" className="gap-2">
                <Briefcase className="h-4 w-4" />
                Informações
              </TabsTrigger>
              <TabsTrigger value="org" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Organização
              </TabsTrigger>
            </TabsList>

            {/* Tab: Informações */}
            <TabsContent value="info" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título do Cargo</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ex: CEO, Head de Vendas, SDR"
                  required
                />
              </div>

              {/* Parent Selector - only in edit mode */}
              {mode === 'edit' && editingNode && availableParents.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4" />
                    Superior Hierárquico
                  </Label>
                  <Select
                    value={selectedParentId || '__root__'}
                    onValueChange={(v) => setSelectedParentId(v === '__root__' ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o superior" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__root__">Nenhum (cargo raiz)</SelectItem>
                      {availableParents.map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          {n.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Altere para realocar este cargo na hierarquia
                  </p>
                </div>
              )}

              {/* Vacancy Status */}
              <div className="space-y-3">
                <Label>Status da Vaga</Label>
                <RadioGroup
                  value={vacancyStatus}
                  onValueChange={(value) => setVacancyStatus(value as VacancyStatus)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="active" id="status-active" />
                    <Label 
                      htmlFor="status-active" 
                      className="flex items-center gap-2 cursor-pointer font-normal"
                    >
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Ativa
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="vacant" id="status-vacant" />
                    <Label 
                      htmlFor="status-vacant" 
                      className="flex items-center gap-2 cursor-pointer font-normal"
                    >
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      Faltando
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Multiple People Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Pessoas neste cargo
                  </Label>
                  <span className="text-xs text-muted-foreground">{people.length} pessoa(s)</span>
                </div>
                
                <div className="space-y-3">
                  {people.map((person, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                      <Avatar className="h-12 w-12 border shrink-0">
                        {person.avatar ? (
                          <AvatarImage src={person.avatar} />
                        ) : null}
                        <AvatarFallback className="bg-muted">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <Input
                          value={person.name}
                          onChange={e => handlePersonNameChange(index, e.target.value)}
                          placeholder={`Nome da pessoa ${index + 1}`}
                          className="h-8"
                        />
                        <div className="flex gap-2">
                          <input
                            type="file"
                            ref={el => fileInputRefs.current[index] = el}
                            onChange={e => handleAvatarUpload(e, index)}
                            accept="image/*"
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => fileInputRefs.current[index]?.click()}
                            disabled={uploadingIndex === index}
                          >
                            <Upload className="h-3 w-3 mr-1" />
                            {uploadingIndex === index ? 'Enviando...' : 'Foto'}
                          </Button>
                          {person.avatar && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-destructive"
                              onClick={() => handleRemoveAvatar(index)}
                            >
                              Remover foto
                            </Button>
                          )}
                        </div>
                      </div>
                      {people.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                          onClick={() => handleRemovePerson(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {people.length < 20 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddPerson}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar pessoa
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label>Responsabilidades</Label>
                <div className="flex gap-2">
                  <Input
                    value={newRole}
                    onChange={e => setNewRole(e.target.value)}
                    placeholder="Adicionar responsabilidade"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddRole())}
                  />
                  <Button type="button" variant="outline" onClick={handleAddRole} disabled={!newRole.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {roles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {roles.map(role => (
                      <Badge key={role} variant="secondary" className="gap-1">
                        {role}
                        <button
                          type="button"
                          onClick={() => handleRemoveRole(role)}
                          className="hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab: Organização */}
            <TabsContent value="org" className="space-y-4 mt-4">
              {/* Node Type */}
              <div className="space-y-2">
                <Label>Tipo de Unidade</Label>
                <div className="grid grid-cols-3 gap-2">
                  {NODE_TYPES.map(({ value, label, icon }) => (
                    <Button
                      key={value}
                      type="button"
                      variant={nodeType === value ? 'default' : 'outline'}
                      size="sm"
                      className="gap-2"
                      onClick={() => setNodeType(value)}
                    >
                      {icon}
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Maturity Level */}
              <div className="space-y-3">
                <Label className="flex items-center justify-between">
                  Nível de Maturidade
                  <Badge variant="outline" className="text-xs">
                    {MATURITY_LABELS[maturityLevel - 1]}
                  </Badge>
                </Label>
                <Slider
                  value={[maturityLevel]}
                  onValueChange={([v]) => setMaturityLevel(v)}
                  min={1}
                  max={5}
                  step={1}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  {MATURITY_LABELS.map(label => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
              </div>

              {/* Capacity Score */}
              <div className="space-y-3">
                <Label className="flex items-center justify-between">
                  Score de Capacidade
                  <Badge variant="outline" className="text-xs">
                    {capacityScore}%
                  </Badge>
                </Label>
                <Slider
                  value={[capacityScore]}
                  onValueChange={([v]) => setCapacityScore(v)}
                  min={0}
                  max={100}
                  step={5}
                />
              </div>

              {/* Key Competencies */}
              <div className="space-y-2">
                <Label>Competências-chave</Label>
                <div className="flex gap-2">
                  <Input
                    value={newCompetency}
                    onChange={e => setNewCompetency(e.target.value)}
                    placeholder="Adicionar competência"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCompetency())}
                  />
                  <Button type="button" variant="outline" onClick={handleAddCompetency} disabled={!newCompetency.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {keyCompetencies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {keyCompetencies.map(comp => (
                      <Badge key={comp} variant="secondary" className="gap-1 bg-primary/10 text-primary">
                        {comp}
                        <button type="button" onClick={() => handleRemoveCompetency(comp)} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Competency Gaps */}
              <div className="space-y-2">
                <Label>Gaps de Competência</Label>
                <div className="flex gap-2">
                  <Input
                    value={newGap}
                    onChange={e => setNewGap(e.target.value)}
                    placeholder="Adicionar gap"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddGap())}
                  />
                  <Button type="button" variant="outline" onClick={handleAddGap} disabled={!newGap.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {competencyGaps.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {competencyGaps.map(gap => (
                      <Badge key={gap} variant="secondary" className="gap-1 bg-destructive/10 text-destructive">
                        {gap}
                        <button type="button" onClick={() => handleRemoveGap(gap)} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              {mode === 'edit' ? 'Salvar' : 'Criar Cargo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
