import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, ExternalLink, Trash2, Send, Eye, CheckCircle, XCircle, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCommercialProposals, type CommercialProposalStatus } from "@/hooks/useCommercialProposals";
import { NewCommercialProposalDialog } from "@/components/proposals/NewCommercialProposalDialog";
import { toast } from "sonner";
import { formatBRT } from "@/lib/datetime";

const STATUS_LABEL: Record<CommercialProposalStatus, string> = {
  draft: "Rascunho",
  sent: "Enviada",
  viewed: "Visualizada",
  accepted: "Aceita",
  rejected: "Recusada",
  expired: "Expirada",
};

const STATUS_VARIANT: Record<CommercialProposalStatus, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  sent: "outline",
  viewed: "default",
  accepted: "default",
  rejected: "destructive",
  expired: "secondary",
};

const STATUS_ICON: Record<CommercialProposalStatus, typeof FileText> = {
  draft: FileText,
  sent: Send,
  viewed: Eye,
  accepted: CheckCircle,
  rejected: XCircle,
  expired: Clock,
};

export default function PropostasComerciaisPage() {
  const navigate = useNavigate();
  const { list, send, remove } = useCommercialProposals();
  const [dialogOpen, setDialogOpen] = useState(false);

  const copyPublicLink = (token: string) => {
    const url = `${window.location.origin}/proposta/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Propostas Comerciais</h1>
          <p className="text-muted-foreground">
            Gere e envie propostas para seus clientes de consultoria.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Proposta
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todas as propostas</CardTitle>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : (list.data?.length ?? 0) === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">
                Nenhuma proposta gerada ainda.
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira proposta
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Visualizações</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data?.map((p) => {
                  const Icon = STATUS_ICON[p.status];
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.title}</TableCell>
                      <TableCell>{p.cliente?.nome_fantasia ?? p.cliente?.razao_social ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[p.status]} className="gap-1">
                          <Icon className="h-3 w-3" />
                          {STATUS_LABEL[p.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{p.viewed_count}</TableCell>
                      <TableCell>
                        {formatBRT(new Date(p.created_at), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/proposta/${p.public_token}`)}
                          title="Abrir prévia"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyPublicLink(p.public_token)}
                          title="Copiar link público"
                        >
                          📋
                        </Button>
                        {p.status === "draft" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => send.mutate(p.id)}
                            disabled={send.isPending}
                            title="Marcar como enviada"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Excluir a proposta "${p.title}"?`)) {
                              remove.mutate(p.id);
                            }
                          }}
                          disabled={remove.isPending}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NewCommercialProposalDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
