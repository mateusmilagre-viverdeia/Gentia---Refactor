import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Linkedin, Instagram, Loader2, Link as LinkIcon } from 'lucide-react';
import { useProfileUrlAnalysis } from '@/hooks/useProfileUrlAnalysis';
import { HuntingProfileAnalysisSheet } from './HuntingProfileAnalysisSheet';

interface Props {
  jobs: Array<{ id: string; title: string }>;
}

export function HuntingProfileUrlAnalyzer({ jobs }: Props) {
  const [url, setUrl] = useState('');
  const [jobId, setJobId] = useState<string>('none');
  const [open, setOpen] = useState(false);
  const { stage, error, result, analyze, reset } = useProfileUrlAnalysis();

  const isBusy = stage === 'scraping' || stage === 'analyzing';

  const stageLabel = (() => {
    switch (stage) {
      case 'scraping': return 'Extraindo perfil…';
      case 'analyzing': return 'Analisando com IA…';
      default: return null;
    }
  })();

  const handleAnalyze = async () => {
    await analyze(url, jobId !== 'none' ? jobId : undefined);
    setOpen(true);
  };

  const detected = (() => {
    if (/linkedin\.com\/in\//i.test(url)) return 'linkedin';
    if (/instagram\.com\//i.test(url)) return 'instagram';
    return null;
  })();

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Analisar perfil por URL
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Cole um link público do LinkedIn ou Instagram. A IA extrai o perfil e avalia aderência técnica e comportamental
            {jobId !== 'none' ? ' contra a vaga selecionada.' : ' (selecione uma vaga para comparar com o ICP).'}
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 md:flex-row">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://linkedin.com/in/... ou https://instagram.com/..."
                className="pl-9 pr-9"
                disabled={isBusy}
              />
              {detected === 'linkedin' && <Linkedin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0A66C2]" />}
              {detected === 'instagram' && <Instagram className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-500" />}
            </div>
            <Select value={jobId} onValueChange={setJobId} disabled={isBusy}>
              <SelectTrigger className="md:w-[260px]">
                <SelectValue placeholder="Vaga (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem vaga (apenas perfil + DISC)</SelectItem>
                {jobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAnalyze} disabled={!url.trim() || isBusy} className="md:w-auto">
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Analisar com IA
            </Button>
          </div>
          {stageLabel && (
            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> {stageLabel}
            </p>
          )}
          {error && stage === 'error' && (
            <p className="mt-2 text-xs text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>

      <HuntingProfileAnalysisSheet
        open={open && (stage === 'done' || isBusy)}
        onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}
        stage={stage}
        result={result}
      />
    </>
  );
}
