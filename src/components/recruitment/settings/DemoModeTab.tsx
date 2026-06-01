import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "@/hooks/useAccount";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sparkles, Trash2, Database, Calendar, AlertTriangle, Compass } from "lucide-react";
import { useSalesDemo } from "@/components/sales-demo/SalesDemoProvider";
import { formatBRT } from "@/lib/datetime";


export function DemoModeTab() {
  const { account } = useAccount();
  const salesDemo = useSalesDemo();
  const queryClient = useQueryClient();
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [confirmSeed, setConfirmSeed] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ["account-demo-config", account?.id],
    queryFn: async () => {
      if (!account?.id) return null;
      const { data, error } = await supabase
        .from("account_demo_config")
        .select("*")
        .eq("account_id", account.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!account?.id,
  });

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return formatBRT(new Date(date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm");
  };

  const handleSeed = async () => {
    if (!account?.id) return;
    setIsSeeding(true);
    setConfirmSeed(false);
    try {
      const { data, error } = await supabase.functions.invoke("demo-seed", {
        body: { account_id: account.id },
      });
      if (error) throw error;
      toast.success("Dados de demonstração criados!", {
        description: `${data?.records_created || 0} registros adicionados.`,
      });
      queryClient.invalidateQueries({ queryKey: ["account-demo-config", account.id] });
    } catch (err: any) {
      toast.error("Erro ao criar dados demo", {
        description: err?.message || "Tente novamente",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClear = async () => {
    if (!account?.id) return;
    setIsClearing(true);
    setConfirmClear(false);
    try {
      const { data, error } = await supabase.functions.invoke("demo-clear", {
        body: { account_id: account.id },
      });
      if (error) throw error;
      const total = data?.deleted
        ? Object.values(data.deleted).reduce((acc: number, n: any) => acc + (n || 0), 0)
        : 0;
      toast.success("Dados demo removidos!", {
        description: `${total} registros excluídos.`,
      });
      queryClient.invalidateQueries({ queryKey: ["account-demo-config", account.id] });
    } catch (err: any) {
      toast.error("Erro ao limpar dados demo", {
        description: err?.message || "Tente novamente",
      });
    } finally {
      setIsClearing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const isActive = config?.demo_mode_active ?? false;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Modo Demonstração
              </CardTitle>
              <CardDescription className="mt-1">
                Popule sua conta com dados fictícios para explorar o módulo de recrutamento. Todos
                os registros gerados são marcados como demo e podem ser removidos a qualquer
                momento.
              </CardDescription>
            </div>
            <Badge variant={isActive ? "default" : "secondary"}>
              {isActive ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Aviso */}
          <div className="flex gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
            <div className="space-y-1 text-sm">
              <p className="font-medium">Importante</p>
              <p className="text-muted-foreground">
                Os dados de demonstração ficam visíveis em listagens, dashboards e funis. Use
                apenas em contas de teste ou para apresentações. Nenhum dado real será afetado.
              </p>
            </div>
          </div>

          {/* Métricas */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Database className="h-4 w-4" />
                Registros demo
              </div>
              <div className="mt-1 text-2xl font-bold">{config?.demo_records_count ?? 0}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Última ativação
              </div>
              <div className="mt-1 text-sm font-medium">{formatDate(config?.last_seed_at ?? null)}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Última limpeza
              </div>
              <div className="mt-1 text-sm font-medium">{formatDate(config?.last_clear_at ?? null)}</div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => setConfirmSeed(true)}
              disabled={isSeeding || isClearing}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {isSeeding ? "Gerando..." : isActive ? "Recriar dados demo" : "Ativar modo demo"}
            </Button>
            {isActive && (
              <Button
                variant="outline"
                onClick={() => setConfirmClear(true)}
                disabled={isSeeding || isClearing}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {isClearing ? "Removendo..." : "Limpar dados demo"}
              </Button>
            )}
            {isActive && (
              <Button
                variant="outline"
                onClick={() => salesDemo.openPanel()}
                className="gap-2"
                style={{ borderColor: "#D97706", color: "#92400E" }}
              >
                <Compass className="h-4 w-4" />
                🎯 Demo Guiada
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmSeed} onOpenChange={setConfirmSeed}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ativar modo demonstração?</AlertDialogTitle>
            <AlertDialogDescription>
              Serão criados clientes, vagas, candidatos e candidaturas fictícias na sua conta.
              Esses dados ficarão visíveis em todas as telas até serem removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSeed}>Ativar modo demo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover todos os dados demo?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os registros marcados como demonstração (clientes, vagas, candidatos,
              candidaturas, NPS e histórico) serão excluídos permanentemente. Dados reais não
              serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClear}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, remover tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
