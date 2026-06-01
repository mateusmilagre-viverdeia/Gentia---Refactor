import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, BookOpen, AlertTriangle, CheckCircle2, Loader2, ArrowRight, Info } from 'lucide-react';
import { PILLAR_LABELS, CulturePillar } from '@/types/pulseCulture.types';

interface SyncResult {
  success: boolean;
  questionsCount: number;
  newCount: number;
  skippedCount: number;
  byPillar: Record<string, number>;
  cultureDataFound: {
    mission: boolean;
    vision: boolean;
    values: number;
    decision: boolean;
    indicators: number;
    projects: number;
    energy: number;
    development: number;
  };
}

interface Props {
  questionsCount: number;
  byPillar: Record<CulturePillar, number>;
  loading: boolean;
  syncing: boolean;
  lastSyncResult: SyncResult | null;
  onSync: () => Promise<boolean>;
  onRefresh: () => void;
  onNavigateToQuestions?: () => void;
}

export function PulseAdminCultureSync({
  questionsCount,
  byPillar,
  loading,
  syncing,
  lastSyncResult,
  onSync,
  onRefresh,
  onNavigateToQuestions,
}: Props) {
  const [showResult, setShowResult] = useState(false);

  const handleSync = async () => {
    setShowResult(false);
    const success = await onSync();
    if (success) {
      setShowResult(true);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Perguntas de Cultura
            </CardTitle>
            <CardDescription>
              Sincronize perguntas baseadas nos pilares de cultura da sua empresa.
            </CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={onRefresh} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {questionsCount === 0 ? (
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>Nenhuma pergunta de cultura configurada.</strong>
              <p className="mt-1 text-sm">
                As perguntas de cultura são baseadas nos Valores e Pilares 
                cadastrados no módulo Criação de Cultura. Clique em "Sincronizar" 
                para gerar perguntas automaticamente.
              </p>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-medium">{questionsCount} perguntas de cultura ativas</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(byPillar).map(([pillar, count]) => (
                <Badge key={pillar} variant="secondary">
                  {PILLAR_LABELS[pillar as CulturePillar] || pillar}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {showResult && lastSyncResult && (
          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              {lastSyncResult.newCount > 0 ? (
                <>
                  <strong>{lastSyncResult.newCount} nova{lastSyncResult.newCount > 1 ? 's' : ''} pergunta{lastSyncResult.newCount > 1 ? 's' : ''} sincronizada{lastSyncResult.newCount > 1 ? 's' : ''}!</strong>
                  {lastSyncResult.skippedCount > 0 && (
                    <span className="text-sm ml-1">
                      ({lastSyncResult.skippedCount} já existia{lastSyncResult.skippedCount > 1 ? 'm' : ''} e {lastSyncResult.skippedCount > 1 ? 'foram ignoradas' : 'foi ignorada'})
                    </span>
                  )}
                </>
              ) : (
                <strong>Nenhuma pergunta nova — todas já existiam no banco.</strong>
              )}
              
              <div className="mt-3 p-2 rounded bg-blue-100 dark:bg-blue-900 text-sm">
                <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
                As perguntas foram criadas como <strong>INATIVAS</strong>. 
                Acesse o Banco de Perguntas para ativá-las manualmente.
              </div>

              {onNavigateToQuestions && (
                <div className="mt-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onNavigateToQuestions}
                    className="gap-2"
                  >
                    Ver Perguntas
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="pt-2">
          <Button onClick={handleSync} disabled={syncing} className="gap-2">
            {syncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Sincronizar Perguntas de Cultura
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Isso irá gerar perguntas baseadas em: Missão, Visão, Valores, Decisão, Indicadores, Projetos, Energia e Desenvolvimento.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
