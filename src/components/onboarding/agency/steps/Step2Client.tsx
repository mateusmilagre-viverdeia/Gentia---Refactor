import { useState } from "react";
import { Loader2, SkipForward, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAgencyOnboarding } from "../AgencyOnboardingWizardContext";
import { toast } from "sonner";

interface Props {
  onComplete: () => void;
  onSkip: () => Promise<void>;
}

export function Step2Client({ onComplete, onSkip }: Props) {
  const { currentAccount } = useOrganization();
  const { setClientId } = useAgencyOnboarding();
  const [empresa, setEmpresa] = useState("");
  const [contato, setContato] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [modeloFee, setModeloFee] = useState("percentual");
  const [feePercentual, setFeePercentual] = useState<string>("");
  const [feeFixo, setFeeFixo] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!empresa.trim() || !currentAccount) {
      toast.error("Informe ao menos o nome da empresa");
      return;
    }
    setSaving(true);
    try {
      const pctNum = feePercentual ? parseFloat(feePercentual.replace(",", ".")) : null;
      const fixoNum = feeFixo ? parseFloat(feeFixo.replace(",", ".")) : null;
      const { data: cliente, error } = await supabase
        .from("clientes_consultoria")
        .insert({
          account_id: currentAccount.id,
          razao_social: empresa.trim(),
          modelo_fee: modeloFee,
          fee_percentual:
            modeloFee === "percentual" || modeloFee === "hibrido" ? pctNum : null,
          fee_fixo:
            modeloFee === "fixo" || modeloFee === "hibrido" ? fixoNum : null,
          status: "ativo",
        })
        .select("id")
        .single();
      if (error) throw error;

      if (contato.trim() || email.trim() || whatsapp.trim()) {
        await supabase.from("clientes_contatos").insert({
          account_id: currentAccount.id,
          cliente_id: cliente.id,
          nome: contato.trim() || empresa.trim(),
          email: email.trim() || null,
          whatsapp: whatsapp.trim() || null,
          eh_contato_principal: true,
          eh_decisor: true,
        });
      }

      setClientId(cliente.id);
      toast.success("Cliente cadastrado");
      onComplete();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao cadastrar cliente");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold">Primeiro cliente</h3>
        <p className="text-sm text-muted-foreground">
          Cadastre um cliente para vincular sua primeira vaga.
        </p>
      </div>

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label>Empresa *</Label>
          <Input value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Contato principal</Label>
          <Input value={contato} onChange={(e) => setContato(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>WhatsApp</Label>
            <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Modelo de fee</Label>
          <Select value={modeloFee} onValueChange={setModeloFee}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentual">Percentual sobre salário</SelectItem>
              <SelectItem value="fixo">Fee fixo</SelectItem>
              <SelectItem value="hibrido">Híbrido</SelectItem>
              <SelectItem value="success_fee">Success fee</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(modeloFee === "percentual" || modeloFee === "hibrido") && (
          <div className="space-y-2">
            <Label>Percentual (%)</Label>
            <div className="relative">
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.5"
                value={feePercentual}
                onChange={(e) => setFeePercentual(e.target.value)}
                placeholder="Ex: 20"
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                %
              </span>
            </div>
          </div>
        )}

        {(modeloFee === "fixo" || modeloFee === "hibrido") && (
          <div className="space-y-2">
            <Label>Valor fixo (R$)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                R$
              </span>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="100"
                value={feeFixo}
                onChange={(e) => setFeeFixo(e.target.value)}
                placeholder="Ex: 5000"
                className="pl-10"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onSkip}>
          <SkipForward className="h-4 w-4" />
          Pular
        </Button>
        <Button onClick={handleSave} disabled={saving || !empresa.trim()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Salvar e continuar
        </Button>
      </div>
    </div>
  );
}
