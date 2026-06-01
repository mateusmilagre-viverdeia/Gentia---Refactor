import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCommercialProposals } from "@/hooks/useCommercialProposals";
import { useClients } from "@/hooks/useClients";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function NewCommercialProposalDialog({ open, onOpenChange }: Props) {
  const { generate } = useCommercialProposals();
  const { data: clients } = useClients({ status: "ativo" });

  const [clienteId, setClienteId] = useState("");
  const [title, setTitle] = useState("");
  const [scopeBrief, setScopeBrief] = useState("");
  const [pricingHint, setPricingHint] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("50% no início, 50% na entrega");
  const [validityDays, setValidityDays] = useState("15");

  const reset = () => {
    setClienteId("");
    setTitle("");
    setScopeBrief("");
    setPricingHint("");
    setPaymentTerms("50% no início, 50% na entrega");
    setValidityDays("15");
  };

  const handleGenerate = async () => {
    if (!clienteId || !title || !scopeBrief) return;
    await generate.mutateAsync({
      cliente_id: clienteId,
      title,
      scope_brief: scopeBrief,
      pricing_hint: pricingHint || undefined,
      payment_terms: paymentTerms || undefined,
      validity_days: Number(validityDays) || 15,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova proposta comercial</DialogTitle>
          <DialogDescription>
            Descreva o escopo e a IA gera uma proposta consultiva completa em Markdown.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {(clients ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome_fantasia ?? c.razao_social}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Título da proposta *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Recrutamento Executivo - Diretor Comercial"
            />
          </div>

          <div className="space-y-2">
            <Label>Escopo / briefing *</Label>
            <Textarea
              rows={5}
              value={scopeBrief}
              onChange={(e) => setScopeBrief(e.target.value)}
              placeholder="Descreva o serviço, contexto do cliente, objetivos, prazos esperados..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Sugestão de precificação</Label>
              <Input
                value={pricingHint}
                onChange={(e) => setPricingHint(e.target.value)}
                placeholder="Ex: 25% do salário anual"
              />
            </div>
            <div className="space-y-2">
              <Label>Validade (dias)</Label>
              <Input
                type="number"
                value={validityDays}
                onChange={(e) => setValidityDays(e.target.value)}
                min={1}
                max={90}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Condições de pagamento</Label>
            <Input
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!clienteId || !title || !scopeBrief || generate.isPending}
          >
            {generate.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar com IA
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
