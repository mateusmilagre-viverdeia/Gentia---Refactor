import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Zap, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDailyPulseStatus } from '@/hooks/useDailyPulseStatus';
import { toast } from 'sonner';

interface ManualPulseGeneratorProps {
  accountId: string;
}

export function ManualPulseGenerator({ accountId }: ManualPulseGeneratorProps) {
  const { hasAssignment, questionsCount, isLoading, refetch } = useDailyPulseStatus(accountId);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase.functions.invoke('generate-daily-pulse', {
        body: { 
          account_id: accountId,
          date: today
        }
      });

      if (error) {
        console.error('Error generating pulse:', error);
        toast.error('Erro ao gerar pulso', {
          description: error.message || 'Tente novamente mais tarde'
        });
        return;
      }

      if (data?.success) {
        toast.success('Pulso gerado com sucesso!', {
          description: `${data.questionsCount || data.questions_count || 0} perguntas foram selecionadas para hoje`
        });
        refetch();
      } else {
        toast.error('Erro ao gerar pulso', {
          description: data?.error || 'Resposta inválida do servidor'
        });
      }
    } catch (error) {
      console.error('Error generating pulse:', error);
      toast.error('Erro ao gerar pulso', {
        description: 'Erro de conexão. Tente novamente.'
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Geração Manual de Pulso
        </CardTitle>
        <CardDescription>
          Gere o pulso diário manualmente para testes ou quando o cron não estiver configurado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verificando status...
          </div>
        ) : hasAssignment ? (
          <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div className="flex-1">
              <p className="font-medium text-green-700 dark:text-green-400">
                Pulso de hoje já foi gerado
              </p>
              <p className="text-sm text-muted-foreground">
                {questionsCount} perguntas selecionadas
              </p>
            </div>
            <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">
              Ativo
            </Badge>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <div className="flex-1">
              <p className="font-medium text-amber-700 dark:text-amber-400">
                Pulso de hoje ainda não foi gerado
              </p>
              <p className="text-sm text-muted-foreground">
                Clique no botão abaixo para gerar agora
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button
            onClick={handleGenerate}
            disabled={generating || hasAssignment}
            className="gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Gerar Pulso de Hoje
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={refetch}
            disabled={isLoading}
            title="Atualizar status"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          ℹ️ O pulso é gerado automaticamente todo dia às 6h (BRT) quando o cron externo está configurado.
          Use este botão para testes ou geração manual.
        </p>
      </CardContent>
    </Card>
  );
}
