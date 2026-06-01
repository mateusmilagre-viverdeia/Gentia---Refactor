import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Zap, Brain, Search, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useAutonomousSearch } from '@/hooks/useAutonomousSearch';

interface AutonomousSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobs: Array<{ id: string; title: string; location?: string }>;
  onSearchComplete?: (searchId: string) => void;
}

export function AutonomousSearchDialog({
  open,
  onOpenChange,
  jobs,
  onSearchComplete,
}: AutonomousSearchDialogProps) {
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [maxResults, setMaxResults] = useState<number>(10);
  const [useApollo, setUseApollo] = useState<boolean>(true);
  const { startAutonomousSearch, isSearching, status, resultsCount, reset } = useAutonomousSearch();

  const handleStart = async () => {
    if (!selectedJobId) return;
    const result = await startAutonomousSearch(selectedJobId, maxResults, useApollo);
    if (result?.search_id) {
      onSearchComplete?.(result.search_id);
    }
  };

  const handleClose = () => {
    if (!isSearching) {
      reset();
      setSelectedJobId('');
      onOpenChange(false);
    }
  };

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Busca Autônoma
          </DialogTitle>
          <DialogDescription>
            A IA vai buscar, analisar e rankear candidatos automaticamente com base no Job Description e ICP da vaga.
          </DialogDescription>
        </DialogHeader>

        {status === 'completed' ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-3" />
            <p className="text-lg font-semibold">{resultsCount} perfis encontrados</p>
            <p className="text-sm text-muted-foreground mt-1">
              Candidatos analisados e rankeados por aderência
            </p>
            <Button className="mt-4" onClick={handleClose}>
              Ver Resultados
            </Button>
          </div>
        ) : status === 'failed' ? (
          <div className="py-6 text-center">
            <p className="text-destructive font-medium">Busca falhou</p>
            <p className="text-sm text-muted-foreground mt-1">
              Verifique se a vaga possui descrição e tente novamente.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => reset()}>
              Tentar Novamente
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Vaga</Label>
                <Select
                  value={selectedJobId}
                  onValueChange={setSelectedJobId}
                  disabled={isSearching}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a vaga" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map(job => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title} {job.location ? `· ${job.location}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantidade máxima de perfis: {maxResults}</Label>
                <Slider
                  value={[maxResults]}
                  onValueChange={([v]) => setMaxResults(v)}
                  min={5}
                  max={20}
                  step={5}
                  disabled={isSearching}
                />
                <p className="text-xs text-muted-foreground">
                  Cada perfil será analisado individualmente pela IA
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="use-apollo"
                  checked={useApollo}
                  onCheckedChange={(checked) => setUseApollo(checked === true)}
                  disabled={isSearching}
                />
                <Label htmlFor="use-apollo" className="text-sm font-normal cursor-pointer">
                  Usar Apollo People Search
                </Label>
                <Badge variant="info" className="text-xs">Recomendado</Badge>
              </div>

              {selectedJob && (
                <div className="rounded-lg border p-3 bg-muted/50 space-y-1">
                  <p className="text-sm font-medium">O que a IA vai fazer:</p>
                  <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Search className="h-3 w-3" />
                      Gerar query inteligente baseada no JD + ICP
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Brain className="h-3 w-3" />
                      Buscar perfis no LinkedIn via Firecrawl
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Zap className="h-3 w-3" />
                      Analisar e pontuar cada perfil (0-100)
                    </span>
                  </div>
                </div>
              )}

              {isSearching && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm">Buscando e analisando perfis...</span>
                  </div>
                  <Progress value={undefined} className="h-2" />
                  {resultsCount > 0 && (
                    <Badge variant="secondary">{resultsCount} perfis analisados</Badge>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isSearching}>
                Cancelar
              </Button>
              <Button
                onClick={handleStart}
                disabled={!selectedJobId || isSearching}
              >
                {isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Iniciar Busca
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
