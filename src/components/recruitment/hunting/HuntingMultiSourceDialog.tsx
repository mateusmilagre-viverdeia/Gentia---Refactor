import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Github, Code2, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { useGitHubScraper, useStackOverflowScraper, useTunedAutonomousSearch, useHuntingIntent } from '@/hooks/useHuntingIntent';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  jobId: string;
  accountId: string;
  searchId?: string | null;
  defaultSkills?: string[];
  defaultLocation?: string;
  onComplete?: () => void;
}

export function HuntingMultiSourceDialog({
  open, onOpenChange, jobId, accountId, searchId, defaultSkills = [], defaultLocation = '', onComplete,
}: Props) {
  const { searchGitHub, searching: ghSearching } = useGitHubScraper();
  const { searchSO, searching: soSearching } = useStackOverflowScraper();
  const { runTunedSearch, running: tunedRunning } = useTunedAutonomousSearch();
  const { refreshTalentPool, refreshing } = useHuntingIntent();

  const [skills, setSkills] = useState(defaultSkills.join(', '));
  const [location, setLocation] = useState(defaultLocation);
  const [language, setLanguage] = useState('');
  const [minFollowers, setMinFollowers] = useState('10');
  const [tags, setTags] = useState(defaultSkills.slice(0, 3).join(', '));
  const [minRep, setMinRep] = useState('1000');
  const [desiredQualified, setDesiredQualified] = useState('10');
  const [maxRounds, setMaxRounds] = useState('3');

  const handleGitHub = async () => {
    if (!searchId) return;
    await searchGitHub({
      search_id: searchId,
      account_id: accountId,
      skills: skills.split(',').map(s => s.trim()).filter(Boolean),
      location: location || undefined,
      language: language || undefined,
      min_followers: minFollowers ? parseInt(minFollowers) : undefined,
      max_results: 20,
    });
    onComplete?.();
  };

  const handleSO = async () => {
    if (!searchId) return;
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
    if (tagList.length === 0) return;
    await searchSO({
      search_id: searchId,
      account_id: accountId,
      tags: tagList,
      min_reputation: minRep ? parseInt(minRep) : 1000,
      location: location || undefined,
      max_results: 20,
    });
    onComplete?.();
  };

  const handleTuned = async () => {
    await runTunedSearch({
      job_id: jobId,
      account_id: accountId,
      desired_qualified: parseInt(desiredQualified) || 10,
      max_rounds: parseInt(maxRounds) || 3,
    });
    onComplete?.();
  };

  const handleRefresh = async () => {
    await refreshTalentPool({ account_id: accountId, max_profiles: 50 });
    onComplete?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Diversificar fontes de hunting</DialogTitle>
          <DialogDescription>
            Amplie a descoberta para além do LinkedIn e detecte sinais de intenção (mudança de emprego, open-to-work).
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="tuned">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tuned"><Sparkles className="h-3.5 w-3.5 mr-1" />Adaptativa</TabsTrigger>
            <TabsTrigger value="github"><Github className="h-3.5 w-3.5 mr-1" />GitHub</TabsTrigger>
            <TabsTrigger value="so"><Code2 className="h-3.5 w-3.5 mr-1" />Stack Overflow</TabsTrigger>
            <TabsTrigger value="refresh"><RefreshCw className="h-3.5 w-3.5 mr-1" />Sinais</TabsTrigger>
          </TabsList>

          <TabsContent value="tuned" className="space-y-3 pt-3">
            <p className="text-sm text-muted-foreground">
              Roda a busca autônoma várias rodadas, relaxando critérios (localização → títulos → senioridade) até bater a meta de qualificados.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Qualificados desejados</Label>
                <Input type="number" value={desiredQualified} onChange={e => setDesiredQualified(e.target.value)} />
              </div>
              <div>
                <Label>Máx. rodadas</Label>
                <Input type="number" value={maxRounds} onChange={e => setMaxRounds(e.target.value)} max={4} />
              </div>
            </div>
            <Button onClick={handleTuned} disabled={tunedRunning} className="w-full">
              {tunedRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Rodar busca adaptativa
            </Button>
          </TabsContent>

          <TabsContent value="github" className="space-y-3 pt-3">
            <p className="text-sm text-muted-foreground">Encontre devs que codam — perfis técnicos que nem sempre estão no LinkedIn.</p>
            <div>
              <Label>Skills / palavras-chave (separadas por vírgula)</Label>
              <Input value={skills} onChange={e => setSkills(e.target.value)} placeholder="react, typescript, nextjs" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Localização</Label>
                <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Brazil" />
              </div>
              <div>
                <Label>Linguagem principal</Label>
                <Input value={language} onChange={e => setLanguage(e.target.value)} placeholder="typescript" />
              </div>
              <div>
                <Label>Min. seguidores</Label>
                <Input type="number" value={minFollowers} onChange={e => setMinFollowers(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleGitHub} disabled={ghSearching || !searchId} className="w-full">
              {ghSearching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Github className="h-4 w-4 mr-2" />}
              Buscar no GitHub
            </Button>
            {!searchId && <p className="text-xs text-muted-foreground">Crie ou selecione uma busca antes de usar GitHub.</p>}
          </TabsContent>

          <TabsContent value="so" className="space-y-3 pt-3">
            <p className="text-sm text-muted-foreground">Top respondedores em tags específicas — especialistas validados pela comunidade.</p>
            <div>
              <Label>Tags Stack Overflow (separadas por vírgula)</Label>
              <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="react, typescript" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Reputação mínima</Label>
                <Input type="number" value={minRep} onChange={e => setMinRep(e.target.value)} />
              </div>
              <div>
                <Label>Localização (opcional)</Label>
                <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Brazil" />
              </div>
            </div>
            <Button onClick={handleSO} disabled={soSearching || !searchId} className="w-full">
              {soSearching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Code2 className="h-4 w-4 mr-2" />}
              Buscar no Stack Overflow
            </Button>
          </TabsContent>

          <TabsContent value="refresh" className="space-y-3 pt-3">
            <p className="text-sm text-muted-foreground">
              Re-analisa perfis do talent pool desta conta para detectar sinais novos: mudou de emprego, ativou open-to-work, foi promovido.
            </p>
            <Button onClick={handleRefresh} disabled={refreshing} className="w-full">
              {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Atualizar e detectar sinais (até 50 perfis)
            </Button>
            <p className="text-xs text-muted-foreground">
              O cron mensal já executa isso automaticamente no dia 1 de cada mês.
            </p>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
