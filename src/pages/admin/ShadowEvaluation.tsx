import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert, Activity, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";

interface SettingsRow {
  key: string;
  value: any;
}

interface ShadowSession {
  id: string;
  matching_score: number | null;
  legacy_score: number | null;
  legacy_recommendation: string | null;
  red_flags_count: number | null;
  avg_confidence_level: string | null;
  evidence_floor_passed: boolean | null;
  completed_at: string | null;
  duration_seconds: number | null;
  evaluation_audit_trail: any;
}

function useShadowSettings() {
  return useQuery({
    queryKey: ["platform-eval-settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("platform_evaluation_settings")
        .select("key, value")
        .in("key", ["culture_evaluation_active_version", "culture_evaluation_shadow_enabled"]);
      if (error) throw error;
      const map = new Map<string, any>();
      for (const row of (data ?? []) as SettingsRow[]) map.set(row.key, row.value);
      return {
        activeVersion: (map.get("culture_evaluation_active_version") ?? "legacy") as "legacy" | "new",
        shadowEnabled: map.get("culture_evaluation_shadow_enabled") ?? true,
      };
    },
  });
}

function useShadowSessions() {
  return useQuery<ShadowSession[]>({
    queryKey: ["culture-shadow-sessions"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("culture_interview_sessions")
        .select("id, matching_score, legacy_score, legacy_recommendation, red_flags_count, avg_confidence_level, evidence_floor_passed, completed_at, duration_seconds, evaluation_audit_trail")
        .not("legacy_score", "is", null)
        .order("completed_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as ShadowSession[];
    },
  });
}

export default function ShadowEvaluationPage() {
  const qc = useQueryClient();
  const { data: settings, isLoading: loadingSettings } = useShadowSettings();
  const { data: sessions, isLoading: loadingSessions } = useShadowSessions();
  const [shadowEnabled, setShadowEnabled] = useState<boolean>(true);

  useEffect(() => {
    if (settings) setShadowEnabled(!!settings.shadowEnabled);
  }, [settings]);

  const saveSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await (supabase as any)
        .from("platform_evaluation_settings")
        .upsert({ key, value }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configuração atualizada");
      qc.invalidateQueries({ queryKey: ["platform-eval-settings"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao salvar"),
  });

  const stats = useMemo(() => {
    if (!sessions || sessions.length === 0) return null;
    const withDiff = sessions.filter(s => s.legacy_score != null && s.matching_score != null);
    const avgDelta = withDiff.length === 0 ? 0 :
      withDiff.reduce((acc, s) => {
        const v2 = s.evaluation_audit_trail?.v2?.score ?? s.matching_score ?? 0;
        return acc + (v2 - (s.legacy_score ?? 0));
      }, 0) / withDiff.length;
    const recChanged = sessions.filter(s => s.evaluation_audit_trail?.diff?.recommendation_changed).length;
    const lowConfidence = sessions.filter(s => s.avg_confidence_level === 'low').length;
    const totalRedFlags = sessions.reduce((acc, s) => acc + (s.red_flags_count ?? 0), 0);
    const evidenceFloorFail = sessions.filter(s => s.evidence_floor_passed === false).length;
    return { count: sessions.length, avgDelta, recChanged, lowConfidence, totalRedFlags, evidenceFloorFail };
  }, [sessions]);

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-6xl">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ArrowRightLeft className="h-7 w-7" /> Avaliação Cultural — Modo Sombra
        </h1>
        <p className="text-muted-foreground">
          Compare a calibração antiga (legacy) com a nova régua V2 antes de virar a chave.
          Durante o modo sombra, ambas rodam em paralelo: o recrutador continua vendo o score
          legacy, mas o V2 fica registrado para análise.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuração</CardTitle>
          <CardDescription>Controle qual versão é a canônica e se o modo sombra está ativo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingSettings ? (
            <Skeleton className="h-20" />
          ) : (
            <>
              <div className="flex items-center justify-between border rounded-lg p-4">
                <div>
                  <Label className="text-base">Versão ativa para recrutadores</Label>
                  <p className="text-sm text-muted-foreground">
                    Hoje: <Badge variant="outline">{settings?.activeVersion === "new" ? "V2 (nova régua)" : "Legacy (antiga)"}</Badge>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={settings?.activeVersion === "legacy" ? "default" : "outline"}
                    size="sm"
                    disabled={saveSetting.isPending}
                    onClick={() => saveSetting.mutate({ key: "culture_evaluation_active_version", value: "legacy" })}
                  >
                    Usar Legacy
                  </Button>
                  <Button
                    variant={settings?.activeVersion === "new" ? "default" : "outline"}
                    size="sm"
                    disabled={saveSetting.isPending}
                    onClick={() => saveSetting.mutate({ key: "culture_evaluation_active_version", value: "new" })}
                  >
                    Virar para V2
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between border rounded-lg p-4">
                <div>
                  <Label htmlFor="shadow" className="text-base">Modo sombra</Label>
                  <p className="text-sm text-muted-foreground">
                    Roda legacy + V2 em toda avaliação. Custo de IA dobra enquanto ativo.
                  </p>
                </div>
                <Switch
                  id="shadow"
                  checked={shadowEnabled}
                  onCheckedChange={(v) => {
                    setShadowEnabled(v);
                    saveSetting.mutate({ key: "culture_evaluation_shadow_enabled", value: v });
                  }}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="Sessões comparadas" value={stats.count.toString()} />
          <StatCard label="Δ médio (V2 − Legacy)" value={`${stats.avgDelta > 0 ? '+' : ''}${stats.avgDelta.toFixed(1)}pts`} highlight={stats.avgDelta < -5 ? 'red' : stats.avgDelta > 5 ? 'green' : undefined} />
          <StatCard label="Recomendação mudou" value={stats.recChanged.toString()} highlight={stats.recChanged > stats.count * 0.3 ? 'amber' : undefined} />
          <StatCard label="Confiança baixa" value={stats.lowConfidence.toString()} />
          <StatCard label="Sinais de alerta" value={stats.totalRedFlags.toString()} highlight={stats.totalRedFlags > 0 ? 'red' : undefined} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Últimas 100 avaliações</CardTitle>
          <CardDescription>Comparação lado a lado entre Legacy e V2.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSessions ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : !sessions || sessions.length === 0 ? (
            <Alert>
              <Activity className="h-4 w-4" />
              <AlertTitle>Sem dados ainda</AlertTitle>
              <AlertDescription>
                Aguarde novas entrevistas serem concluídas para ver a comparação.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-3">Data</th>
                    <th className="py-2 pr-3">Legacy</th>
                    <th className="py-2 pr-3">V2</th>
                    <th className="py-2 pr-3">Δ</th>
                    <th className="py-2 pr-3">Mudou rec.?</th>
                    <th className="py-2 pr-3">Confiança</th>
                    <th className="py-2 pr-3">Red flags</th>
                    <th className="py-2 pr-3">Piso ev.</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => {
                    const v2Score = s.evaluation_audit_trail?.v2?.score ?? null;
                    const v2Rec = s.evaluation_audit_trail?.v2?.recommendation ?? null;
                    const delta = v2Score != null && s.legacy_score != null ? v2Score - s.legacy_score : null;
                    const recChanged = !!s.evaluation_audit_trail?.diff?.recommendation_changed;
                    return (
                      <tr key={s.id} className="border-b hover:bg-muted/30">
                        <td className="py-2 pr-3 text-xs text-muted-foreground">
                          {s.completed_at ? new Date(s.completed_at).toLocaleString('pt-BR') : '—'}
                        </td>
                        <td className="py-2 pr-3">
                          {s.legacy_score?.toFixed(1) ?? '—'}{' '}
                          <span className="text-xs text-muted-foreground">{s.legacy_recommendation}</span>
                        </td>
                        <td className="py-2 pr-3">
                          {v2Score != null ? v2Score.toFixed(1) : '—'}{' '}
                          <span className="text-xs text-muted-foreground">{v2Rec}</span>
                        </td>
                        <td className={`py-2 pr-3 font-mono ${delta != null && delta < -10 ? 'text-red-600' : delta != null && delta > 10 ? 'text-emerald-600' : ''}`}>
                          {delta != null ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}` : '—'}
                        </td>
                        <td className="py-2 pr-3">
                          {recChanged ? <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20">Sim</Badge> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="py-2 pr-3">
                          {s.avg_confidence_level ? <Badge variant="outline">{s.avg_confidence_level}</Badge> : '—'}
                        </td>
                        <td className="py-2 pr-3">
                          {s.red_flags_count && s.red_flags_count > 0 ? (
                            <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 gap-1">
                              <ShieldAlert className="h-3 w-3" />{s.red_flags_count}
                            </Badge>
                          ) : '0'}
                        </td>
                        <td className="py-2 pr-3">
                          {s.evidence_floor_passed === false ? <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20">Falhou</Badge> : 'OK'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: 'red' | 'amber' | 'green' }) {
  const cls =
    highlight === 'red' ? 'border-red-500/30 bg-red-500/5' :
    highlight === 'amber' ? 'border-amber-500/30 bg-amber-500/5' :
    highlight === 'green' ? 'border-emerald-500/30 bg-emerald-500/5' : '';
  return (
    <div className={`border rounded-lg p-3 ${cls}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
