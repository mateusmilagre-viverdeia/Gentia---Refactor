import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Building2, Check, AlertCircle, Sparkles } from 'lucide-react';
import type { CultureCodeInput } from '@/types/culture-code.types';

interface HistoryInputProps {
  cultureData: CultureCodeInput | null;
  completionStatus: Record<string, boolean>;
  initialHistory: string;
  generating: boolean;
  onGenerateStructure: (history: string) => void;
}

const pillarNames: Record<string, string> = {
  mission: 'Missão',
  vision: 'Visão',
  values: 'Valores',
  indicators: 'Indicadores',
  projects: 'Projetos',
  energy: 'Energia',
  development: 'Desenvolvimento',
  decision: 'Decisão',
};

export function HistoryInput({ 
  cultureData, 
  completionStatus, 
  initialHistory,
  generating,
  onGenerateStructure 
}: HistoryInputProps) {
  const [history, setHistory] = useState(initialHistory);

  useEffect(() => {
    setHistory(initialHistory);
  }, [initialHistory]);

  const isReady = completionStatus.mission && 
    completionStatus.vision && 
    completionStatus.values;

  return (
    <div className="space-y-6">
      {/* Pillar Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Seus 8 Pilares Culturais
          </CardTitle>
          <CardDescription>
            Status dos pilares que serão usados para gerar o Culture Code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(completionStatus).map(([key, complete]) => (
              <div 
                key={key}
                className={`flex items-center gap-2 p-3 rounded-lg border ${
                  complete 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-muted bg-muted/20'
                }`}
              >
                {complete ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={`text-sm ${complete ? 'text-green-700' : 'text-muted-foreground'}`}>
                  {pillarNames[key]}
                </span>
              </div>
            ))}
          </div>

          {!isReady && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Requisitos mínimos:</strong> Complete pelo menos Missão, Visão e 3 Valores para gerar o Culture Code.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Culture Data Preview */}
      {cultureData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados Carregados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Empresa</p>
              <p className="font-medium">{cultureData.companyName || 'Não informado'}</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Missão</p>
                <p className="text-sm">{cultureData.mission || 'Não definida'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Visão</p>
                <p className="text-sm">{cultureData.vision || 'Não definida'}</p>
              </div>
            </div>

            {cultureData.values.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Valores ({cultureData.values.length})</p>
                <div className="flex flex-wrap gap-2">
                  {cultureData.values.map((v, i) => (
                    <Badge key={i} variant="secondary">{v.label}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* History Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            História da Empresa
          </CardTitle>
          <CardDescription>
            Conte a jornada da empresa para criar uma narrativa impactante
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted/30 rounded-lg text-sm space-y-2">
            <p className="font-medium">Me conte sobre a jornada:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Como e por que a empresa nasceu?</li>
              <li>Principais marcos e transformações ao longo do tempo</li>
              <li>Momentos de virada ou desafios superados</li>
              <li>Conquistas que marcaram a trajetória</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Quanto mais detalhes e emoção, mais impactante ficará o Culture Code!
            </p>
          </div>

          <Textarea
            placeholder="Digite a história da empresa aqui..."
            value={history}
            onChange={(e) => setHistory(e.target.value)}
            rows={10}
            className="resize-none"
          />

          <div className="flex justify-end">
            <Button
              onClick={() => onGenerateStructure(history)}
              disabled={!isReady || generating}
              size="lg"
            >
              {generating ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                  Gerando Estrutura...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Estrutura da Apresentação
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
