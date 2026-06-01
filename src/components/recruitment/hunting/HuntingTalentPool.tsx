import { useState } from 'react';
import { safeScrapeString } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Search, Users, ExternalLink, Tag, Plus, X,
  MessageSquare, StickyNote, Database, Trash2,
} from 'lucide-react';
import { formatBRTRelative } from "@/lib/datetime";


interface TalentPoolEntry {
  id: string;
  candidate_name: string;
  source_url: string | null;
  extracted_data: any;
  skills: string[];
  tags: string[];
  notes: string | null;
  last_contacted_at: string | null;
  created_at: string;
}

interface HuntingTalentPoolProps {
  accountId: string;
}

export function HuntingTalentPool({ accountId }: HuntingTalentPoolProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCandidate, setNewCandidate] = useState({ name: '', source_url: '', skills: '', notes: '' });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['hunting-talent-pool', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hunting_talent_pool')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as TalentPoolEntry[];
    },
    enabled: !!accountId,
  });

  // Filter entries
  const filtered = entries.filter(e => {
    if (searchQuery) {
      const name = (e.candidate_name || '').toLowerCase();
      const title = (e.extracted_data?.title || '').toLowerCase();
      if (!name.includes(searchQuery.toLowerCase()) && !title.includes(searchQuery.toLowerCase())) return false;
    }
    if (skillFilter) {
      if (!e.skills.some(s => s.toLowerCase().includes(skillFilter.toLowerCase()))) return false;
    }
    if (tagFilter) {
      if (!e.tags.some(t => t.toLowerCase().includes(tagFilter.toLowerCase()))) return false;
    }
    return true;
  });

  // All unique skills and tags for quick filters
  const allSkills = [...new Set(entries.flatMap(e => e.skills))].sort();
  const allTags = [...new Set(entries.flatMap(e => e.tags))].sort();

  const saveNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from('hunting_talent_pool')
        .update({ notes })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hunting-talent-pool'] });
      setEditingNotes(null);
      toast({ title: 'Notas salvas' });
    },
  });

  const addTagMutation = useMutation({
    mutationFn: async ({ id, tags }: { id: string; tags: string[] }) => {
      const { error } = await supabase
        .from('hunting_talent_pool')
        .update({ tags })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hunting-talent-pool'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('hunting_talent_pool')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hunting-talent-pool'] });
      toast({ title: 'Candidato removido do Talent Pool' });
    },
  });

  const addCandidateMutation = useMutation({
    mutationFn: async () => {
      const skills = newCandidate.skills.split(',').map(s => s.trim()).filter(Boolean);
      const { error } = await supabase
        .from('hunting_talent_pool')
        .insert({
          account_id: accountId,
          candidate_name: newCandidate.name,
          source_url: newCandidate.source_url || null,
          skills,
          notes: newCandidate.notes || null,
          tags: [],
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hunting-talent-pool'] });
      setShowAddDialog(false);
      setNewCandidate({ name: '', source_url: '', skills: '', notes: '' });
      toast({ title: 'Candidato adicionado ao Talent Pool' });
    },
  });

  const handleAddTag = (entry: TalentPoolEntry, tag: string) => {
    if (!tag.trim() || entry.tags.includes(tag.trim())) return;
    addTagMutation.mutate({ id: entry.id, tags: [...entry.tags, tag.trim()] });
    setTagInput('');
  };

  const handleRemoveTag = (entry: TalentPoolEntry, tag: string) => {
    addTagMutation.mutate({ id: entry.id, tags: entry.tags.filter(t => t !== tag) });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Database className="h-5 w-5" />
            Talent Pool
          </h2>
          <p className="text-muted-foreground text-sm">
            {entries.length} candidatos salvos para futuras vagas
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou cargo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Input
          placeholder="Filtrar skill..."
          value={skillFilter}
          onChange={(e) => setSkillFilter(e.target.value)}
          className="w-40"
        />
        <Input
          placeholder="Filtrar tag..."
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="w-40"
        />
      </div>

      {/* Quick tag filters */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {allTags.slice(0, 15).map(tag => (
            <Badge
              key={tag}
              variant={tagFilter === tag ? 'default' : 'outline'}
              className="cursor-pointer text-xs"
              onClick={() => setTagFilter(tagFilter === tag ? '' : tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando talent pool...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {entries.length === 0 ? 'Talent Pool vazio' : 'Nenhum resultado encontrado'}
            </h3>
            <p className="text-muted-foreground text-sm">
              {entries.length === 0
                ? 'Ao descartar ou importar candidatos do hunting, você pode salvá-los aqui para o futuro.'
                : 'Tente ajustar os filtros de busca.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="space-y-3 pr-4">
            {filtered.map(entry => {
              const data = entry.extracted_data || {};
              return (
                <Card key={entry.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{entry.candidate_name}</h4>
                          {entry.source_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => window.open(entry.source_url!, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                        </div>

                        {(() => {
                          const titleStr = safeScrapeString(data.title);
                          const companyStr = safeScrapeString(data.company);
                          return (titleStr || companyStr) ? (
                            <p className="text-xs text-muted-foreground">
                              {titleStr}{companyStr && ` @ ${companyStr}`}
                            </p>
                          ) : null;
                        })()}

                        {/* Skills */}
                        {entry.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {entry.skills.slice(0, 8).map(skill => (
                              <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                            ))}
                            {entry.skills.length > 8 && (
                              <Badge variant="secondary" className="text-xs">+{entry.skills.length - 8}</Badge>
                            )}
                          </div>
                        )}

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 mt-2 items-center">
                          {entry.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs bg-accent/50 gap-1">
                              {tag}
                              <button onClick={() => handleRemoveTag(entry, tag)} className="hover:text-destructive">
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </Badge>
                          ))}
                          <div className="flex items-center gap-1">
                            <Input
                              placeholder="+ tag"
                              value={tagInput}
                              onChange={(e) => setTagInput(e.target.value)}
                              className="h-5 w-16 text-[10px] px-1"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddTag(entry, tagInput);
                              }}
                            />
                          </div>
                        </div>

                        {/* Notes */}
                        {editingNotes === entry.id ? (
                          <div className="mt-2 space-y-1">
                            <Textarea
                              value={notesText}
                              onChange={(e) => setNotesText(e.target.value)}
                              placeholder="Observações..."
                              className="text-xs min-h-[50px]"
                            />
                            <div className="flex gap-1">
                              <Button size="sm" className="h-6 text-xs" onClick={() => saveNotesMutation.mutate({ id: entry.id, notes: notesText })}>
                                Salvar
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditingNotes(null)}>
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <button
                            className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => { setEditingNotes(entry.id); setNotesText(entry.notes || ''); }}
                          >
                            <StickyNote className="h-3 w-3" />
                            {entry.notes ? entry.notes.substring(0, 80) + (entry.notes.length > 80 ? '...' : '') : 'Adicionar nota...'}
                          </button>
                        )}

                        <p className="text-[10px] text-muted-foreground mt-2">
                          Adicionado {formatBRTRelative(new Date(entry.created_at))}
                          {entry.last_contacted_at && ` · Último contato ${formatBRTRelative(new Date(entry.last_contacted_at))}`}
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteMutation.mutate(entry.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Add Candidate Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar ao Talent Pool</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Nome do candidato *"
              value={newCandidate.name}
              onChange={(e) => setNewCandidate(prev => ({ ...prev, name: e.target.value }))}
            />
            <Input
              placeholder="URL do perfil (LinkedIn, GitHub...)"
              value={newCandidate.source_url}
              onChange={(e) => setNewCandidate(prev => ({ ...prev, source_url: e.target.value }))}
            />
            <Input
              placeholder="Skills (separadas por vírgula)"
              value={newCandidate.skills}
              onChange={(e) => setNewCandidate(prev => ({ ...prev, skills: e.target.value }))}
            />
            <Textarea
              placeholder="Observações..."
              value={newCandidate.notes}
              onChange={(e) => setNewCandidate(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
            <Button onClick={() => addCandidateMutation.mutate()} disabled={!newCandidate.name.trim()}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
