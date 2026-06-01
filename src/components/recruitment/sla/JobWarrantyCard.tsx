import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, AlertTriangle, ExternalLink } from "lucide-react";
import { parseISO, differenceInDays } from "date-fns";
import { formatBRT } from "@/lib/datetime";
import { useGarantiasByJob, useAcionarGarantia } from "@/hooks/useGarantias";
import { Link } from "react-router-dom";

interface Props {
  jobId: string;
}

export function JobWarrantyCard({ jobId }: Props) {
  const { data: garantias = [] } = useGarantiasByJob(jobId);
  const acionar = useAcionarGarantia();

  const [open, setOpen] = useState(false);
  const [dataDeslig, setDataDeslig] = useState(new Date().toISOString().slice(0, 10));
  const [motivo, setMotivo] = useState("pedido_demissao");
  const [obs, setObs] = useState("");

  // Show only the most recent active warranty
  const ativa = garantias.find(g => g.status === "ativa");
  const acionada = garantias.find(g => g.status === "acionada");
  const garantia = ativa || acionada || garantias[0];

  if (!garantia) return null;

  const exp = parseISO(garantia.garantia_expira_em);
  const diasRest = differenceInDays(exp, new Date());

  const colorByDays = diasRest > 14 ? "text-green-600" : diasRest >= 7 ? "text-yellow-600" : diasRest >= 0 ? "text-red-600" : "text-muted-foreground";

  const statusBadge = {
    ativa: <Badge className="bg-green-100 text-green-700">Ativa</Badge>,
    expirada: <Badge variant="outline">Expirada</Badge>,
    acionada: <Badge className="bg-orange-100 text-orange-700">Acionada</Badge>,
    concluida: <Badge variant="secondary">Concluída</Badge>,
  }[garantia.status] || <Badge>{garantia.status}</Badge>;

  const handleAcionar = async () => {
    await acionar.mutateAsync({
      garantia,
      data_desligamento: dataDeslig,
      motivo_desligamento: motivo,
      observacoes: obs,
    });
    setOpen(false);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-600" /> Garantia de reposição
          </CardTitle>
          {statusBadge}
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {garantia.candidato_nome && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Candidato:</span>
              <span className="font-medium">{garantia.candidato_nome}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Contratação:</span>
            <span>{formatBRT(garantia.data_contratacao, "dd/MM/yyyy")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Prazo:</span>
            <span>{garantia.prazo_garantia_dias} dias</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Expira em:</span>
            <span className="font-medium">{formatBRT(exp, "dd/MM/yyyy")}</span>
          </div>

          {garantia.status === "ativa" && (
            <div className="flex justify-between pt-1 border-t border-border/40 mt-2">
              <span className="text-muted-foreground">Dias restantes:</span>
              <span className={`font-semibold ${colorByDays}`}>{diasRest}d</span>
            </div>
          )}

          {garantia.status === "acionada" && (
            <>
              <div className="flex justify-between pt-1 border-t border-border/40 mt-2">
                <span className="text-muted-foreground">Acionada em:</span>
                <span>{garantia.acionada_em && formatBRT(garantia.acionada_em, "dd/MM/yyyy")}</span>
              </div>
              {garantia.motivo_desligamento && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Motivo:</span>
                  <span>{garantia.motivo_desligamento}</span>
                </div>
              )}
              {garantia.vaga_reposicao_id && (
                <Button asChild variant="outline" size="sm" className="w-full mt-2">
                  <Link to={`/atracao-contratacao/recrutamento/jobs/${garantia.vaga_reposicao_id}`}>
                    <ExternalLink className="h-3 w-3 mr-1" /> Ver vaga de reposição
                  </Link>
                </Button>
              )}
            </>
          )}

          {garantia.status === "ativa" && (
            <Button variant="destructive" size="sm" className="w-full mt-2" onClick={() => setOpen(true)}>
              <AlertTriangle className="h-3 w-3 mr-1" /> Acionar garantia de reposição
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Acionar garantia de reposição</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Data de desligamento</Label>
              <Input type="date" value={dataDeslig} onChange={(e) => setDataDeslig(e.target.value)} />
              {new Date(dataDeslig) > exp && (
                <p className="text-xs text-destructive mt-1">⚠️ Data fora do prazo de garantia ({formatBRT(exp, "dd/MM/yyyy")})</p>
              )}
            </div>
            <div>
              <Label>Motivo do desligamento</Label>
              <Select value={motivo} onValueChange={setMotivo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pedido_demissao">Pedido de demissão</SelectItem>
                  <SelectItem value="demissao_sem_justa_causa">Demissão sem justa causa</SelectItem>
                  <SelectItem value="demissao_com_justa_causa">Demissão com justa causa</SelectItem>
                  <SelectItem value="acordo">Acordo</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleAcionar} disabled={acionar.isPending || new Date(dataDeslig) > exp}>
              Acionar e criar reposição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
