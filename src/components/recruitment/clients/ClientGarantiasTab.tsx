import { useGarantiasByClient } from "@/hooks/useGarantias";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, ExternalLink } from "lucide-react";
import { parseISO, differenceInDays } from "date-fns";
import { Link } from "react-router-dom";
import { formatBRT } from "@/lib/datetime";

interface Props {
  clientId: string;
}

const statusBadges: Record<string, { label: string; className: string }> = {
  ativa: { label: "Ativa", className: "bg-green-100 text-green-700" },
  expirada: { label: "Expirada", className: "bg-muted text-muted-foreground" },
  acionada: { label: "Acionada", className: "bg-orange-100 text-orange-700" },
  concluida: { label: "Concluída", className: "bg-blue-100 text-blue-700" },
};

export function ClientGarantiasTab({ clientId }: Props) {
  const { data: garantias = [], isLoading } = useGarantiasByClient(clientId);

  const ativas = garantias.filter(g => g.status === "ativa").length;
  const acionadas = garantias.filter(g => g.status === "acionada").length;
  const total = garantias.length;
  const taxaAcionamento = total > 0 ? ((acionadas / total) * 100).toFixed(1) : "0";

  // Tempo médio de permanência (apenas acionadas)
  const acionadasComData = garantias.filter(g => g.status === "acionada" && g.data_desligamento);
  const tempoMedio = acionadasComData.length > 0
    ? Math.round(
        acionadasComData.reduce((s, g) => s + differenceInDays(parseISO(g.data_desligamento!), parseISO(g.data_contratacao)), 0) /
          acionadasComData.length,
      )
    : 0;

  return (
    <div className="space-y-4">
      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Ativas</p><p className="text-xl font-semibold text-green-600">{ativas}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Acionadas</p><p className="text-xl font-semibold text-orange-600">{acionadas}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Taxa de acionamento</p><p className="text-xl font-semibold">{taxaAcionamento}%</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Tempo médio (dias)</p><p className="text-xl font-semibold">{tempoMedio || "—"}</p></CardContent></Card>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidato</TableHead>
              <TableHead>Vaga</TableHead>
              <TableHead>Contratação</TableHead>
              <TableHead>Prazo</TableHead>
              <TableHead>Expira</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : garantias.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  <Shield className="h-6 w-6 mx-auto mb-2 opacity-40" />
                  Nenhuma garantia registrada
                </TableCell>
              </TableRow>
            ) : garantias.map((g) => {
              const sb = statusBadges[g.status] || { label: g.status, className: "" };
              return (
                <TableRow key={g.id}>
                  <TableCell className="text-sm font-medium">{g.candidato_nome || "—"}</TableCell>
                  <TableCell className="text-sm">{g.vaga_titulo || "—"}</TableCell>
                  <TableCell className="text-sm">{formatBRT(parseISO(g.data_contratacao), "dd/MM/yyyy")}</TableCell>
                  <TableCell className="text-sm">{g.prazo_garantia_dias}d</TableCell>
                  <TableCell className="text-sm">{formatBRT(parseISO(g.garantia_expira_em), "dd/MM/yyyy")}</TableCell>
                  <TableCell><Badge variant="secondary" className={sb.className}>{sb.label}</Badge></TableCell>
                  <TableCell className="text-sm">{g.motivo_desligamento || "—"}</TableCell>
                  <TableCell>
                    {g.vaga_reposicao_id && (
                      <Button asChild size="sm" variant="ghost">
                        <Link to={`/atracao-contratacao/recrutamento/jobs/${g.vaga_reposicao_id}`}>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
