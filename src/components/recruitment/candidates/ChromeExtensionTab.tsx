import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Chrome, ExternalLink, Users, AlertTriangle, CheckCircle2, Copy } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { Link } from "react-router-dom";
import { formatBRT } from "@/lib/datetime";

interface Capture {
  id: string;
  source_url: string;
  raw_data: any;
  processed_data: any;
  processing_status: string;
  candidate_id: string | null;
  job_id: string | null;
  captured_by: string;
  captured_at: string;
  processed_at: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  processing: { label: "Processando", variant: "outline" },
  completed: { label: "Importado", variant: "default" },
  duplicate: { label: "Duplicado", variant: "outline" },
  error: { label: "Erro", variant: "destructive" },
};

export function ChromeExtensionTab() {
  const { account } = useAccount();
  const accountId = account?.id;
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [loading, setLoading] = useState(true);
  const [recruiterMap, setRecruiterMap] = useState<Record<string, string>>({});
  const [jobMap, setJobMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!accountId) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("chrome_extension_captures")
        .select("*")
        .eq("account_id", accountId as string)
        .order("captured_at", { ascending: false })
        .limit(200);
      if (!active) return;
      const list = ((data as unknown) as Capture[]) || [];
      setCaptures(list);

      const userIds = [...new Set(list.map((c) => c.captured_by))];
      const jobIds = [...new Set(list.map((c) => c.job_id).filter(Boolean) as string[])];
      if (userIds.length > 0) {
        const { data: profs } = await (supabase as any)
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds);
        const m: Record<string, string> = {};
        for (const p of profs || []) m[(p as any).user_id] = (p as any).full_name || (p as any).email || "—";
        setRecruiterMap(m);
      }
      if (jobIds.length > 0) {
        const { data: jobs } = await supabase
          .from("recruitment_jobs")
          .select("id, title")
          .in("id", jobIds);
        const m: Record<string, string> = {};
        for (const j of jobs || []) m[(j as any).id] = (j as any).title;
        setJobMap(m);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [accountId]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
  const capturesToday = captures.filter((c) => new Date(c.captured_at) >= today).length;
  const capturesWeek = captures.filter((c) => new Date(c.captured_at) >= weekStart).length;
  const created = captures.filter((c) => c.processing_status === "completed").length;
  const dupes = captures.filter((c) => c.processing_status === "duplicate").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={Chrome} label="Capturas hoje" value={capturesToday} />
        <MetricCard icon={Chrome} label="Capturas (7 dias)" value={capturesWeek} />
        <MetricCard icon={CheckCircle2} label="Candidatos novos" value={created} />
        <MetricCard icon={AlertTriangle} label="Duplicatas" value={dupes} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Chrome className="h-5 w-5" />
            Capturas via Extensão Chrome
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : captures.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Chrome className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>Nenhuma captura ainda. Instale a extensão Chrome para começar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidato</TableHead>
                    <TableHead>Cargo / Empresa</TableHead>
                    <TableHead>Recrutador</TableHead>
                    <TableHead>Vaga</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Capturado em</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {captures.map((c) => {
                    const raw = c.raw_data || {};
                    const proc = c.processed_data || {};
                    const name = proc.nome || raw.name || "—";
                    const cargo = proc.cargo_atual || raw.current_role || raw.headline || "—";
                    const empresa = proc.empresa_atual || raw.current_company;
                    const cfg = STATUS_CONFIG[c.processing_status] || { label: c.processing_status, variant: "outline" as const };
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={raw.photo_url} />
                              <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{cargo}</div>
                          {empresa && <div className="text-xs text-muted-foreground">{empresa}</div>}
                        </TableCell>
                        <TableCell className="text-sm">{recruiterMap[c.captured_by] || "—"}</TableCell>
                        <TableCell className="text-sm">{c.job_id ? jobMap[c.job_id] || "—" : "—"}</TableCell>
                        <TableCell><Badge variant={cfg.variant}>{cfg.label}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatBRT(new Date(c.captured_at), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button asChild size="icon" variant="ghost" title="LinkedIn">
                              <a href={c.source_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                            {c.candidate_id && (
                              <Button asChild size="icon" variant="ghost" title="Ver candidato">
                                <Link to={`/recruitment/candidates/${c.candidate_id}`}>
                                  <Users className="h-4 w-4" />
                                </Link>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <div className="text-2xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
