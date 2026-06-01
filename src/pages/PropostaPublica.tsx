import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";

import { CheckCircle, XCircle, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { fetchProposalByToken, markProposalResponse } from "@/hooks/useCommercialProposals";
import { toast } from "sonner";
import { formatBRT } from "@/lib/datetime";

export default function PropostaPublicaPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [proposal, setProposal] = useState<Awaited<ReturnType<typeof fetchProposalByToken>>>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    (async () => {
      try {
        const p = await fetchProposalByToken(token);
        if (!active) return;
        setProposal(p);
        if (p) {
          // Register view
          await markProposalResponse(token, "view").catch(() => {});
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setActionLoading(true);
    try {
      const res = await markProposalResponse(token, "accept");
      if (res.success) {
        toast.success("Proposta aceita! O time foi notificado.");
        const updated = await fetchProposalByToken(token);
        setProposal(updated);
      } else {
        toast.error(res.error === "already_decided" ? "Esta proposta já foi respondida." : "Falha ao registrar.");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!token) return;
    setActionLoading(true);
    try {
      const res = await markProposalResponse(token, "reject", rejectReason);
      if (res.success) {
        toast.info("Proposta recusada. Obrigado pelo retorno.");
        setRejectOpen(false);
        const updated = await fetchProposalByToken(token);
        setProposal(updated);
      } else {
        toast.error(res.error === "already_decided" ? "Esta proposta já foi respondida." : "Falha ao registrar.");
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md text-center">
          <CardContent className="p-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">Proposta não encontrada</h2>
            <p className="text-muted-foreground">
              Este link pode ter expirado ou ser inválido. Entre em contato com seu consultor.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const decided = proposal.status === "accepted" || proposal.status === "rejected";

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">{proposal.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Para: {proposal.cliente?.nome_fantasia ?? proposal.cliente?.razao_social}
                </p>
                {proposal.validity_date && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Válida até{" "}
                    {formatBRT(new Date(proposal.validity_date), "dd 'de' MMMM 'de' yyyy")}
                  </p>
                )}
              </div>
              {proposal.cliente?.logo_url && (
                <img src={proposal.cliente.logo_url} alt="Logo" className="h-12 w-auto" />
              )}
            </div>
          </CardHeader>
          <CardContent className="prose prose-sm md:prose-base max-w-none dark:prose-invert pt-6">
            <ReactMarkdown>{proposal.ai_generated_content ?? proposal.scope_text ?? ""}</ReactMarkdown>
          </CardContent>
        </Card>

        {!decided ? (
          <Card>
            <CardContent className="p-6 flex flex-col sm:flex-row gap-3 items-center justify-center">
              <Button
                size="lg"
                onClick={handleAccept}
                disabled={actionLoading}
                className="w-full sm:w-auto"
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Aceitar proposta
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setRejectOpen(true)}
                disabled={actionLoading}
                className="w-full sm:w-auto"
              >
                <XCircle className="h-5 w-5 mr-2" />
                Recusar
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className={proposal.status === "accepted" ? "border-green-500" : "border-destructive"}>
            <CardContent className="p-6 text-center">
              {proposal.status === "accepted" ? (
                <>
                  <CheckCircle className="h-10 w-10 mx-auto text-green-500 mb-2" />
                  <p className="font-semibold">Proposta aceita</p>
                  <p className="text-sm text-muted-foreground">Nosso time entrará em contato em breve.</p>
                </>
              ) : (
                <>
                  <XCircle className="h-10 w-10 mx-auto text-destructive mb-2" />
                  <p className="font-semibold">Proposta recusada</p>
                  {proposal.rejection_reason && (
                    <p className="text-sm text-muted-foreground mt-1">"{proposal.rejection_reason}"</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Por qual motivo está recusando?</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Opcional — sua resposta nos ajuda a melhorar."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={actionLoading}>
              Confirmar recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
