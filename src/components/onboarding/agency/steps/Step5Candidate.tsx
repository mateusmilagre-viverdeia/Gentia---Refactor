import { useState } from "react";
import { Loader2, SkipForward, Send, PartyPopper, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAgencyOnboarding } from "../AgencyOnboardingWizardContext";
import { sendWhatsAppMessage } from "@/lib/whatsapp/sendWhatsAppMessage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { OnboardingMode } from "@/hooks/useOnboardingProgress";

interface Props {
  mode?: OnboardingMode;
  onComplete: () => void;
  onSkip: () => Promise<void>;
  onFinish: () => void;
}

function formatWhatsApp(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 2) return `+${digits}`;
  return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Step5Candidate({ mode = "self", onComplete, onSkip, onFinish }: Props) {
  const { jobId } = useAgencyOnboarding();
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [bothFailed, setBothFailed] = useState(false);

  const isAgency = mode === "agency";
  const emailError = email.length > 0 && !EMAIL_REGEX.test(email);
  const phoneDigits = whatsapp.replace(/\D/g, "");
  const phoneValid = phoneDigits.length >= 12; // E.164 country + area + number

  const handleSend = async () => {
    if (!name.trim() || !phoneValid) {
      toast.error("Preencha nome e WhatsApp válido (mín. 12 dígitos com DDI)");
      return;
    }
    setBothFailed(false);
    setSending(true);

    const phoneE164 = `+${phoneDigits}`;
    const link = jobId
      ? `${window.location.origin}/candidato/vaga/${jobId}`
      : `${window.location.origin}/`;
    const message = `Olá ${name.trim()}! Você foi convidado a participar de uma triagem. Acesse: ${link}`;

    let whatsappOk = false;
    let emailOk = false;

    try {
      await sendWhatsAppMessage({ toPhoneE164: phoneE164, message });
      whatsappOk = true;
    } catch (err) {
      console.error("[Step5Candidate] WhatsApp send failed:", err);
    }

    if (email && EMAIL_REGEX.test(email)) {
      try {
        await supabase.functions.invoke("send-candidate-invite", {
          body: { email, name: name.trim(), jobId, link },
        });
        emailOk = true;
      } catch (emailErr) {
        console.error("[Step5Candidate] Email invite failed:", emailErr);
      }
    }

    setSending(false);

    if (whatsappOk || emailOk) {
      if (whatsappOk && emailOk) {
        toast.success("Convite enviado por WhatsApp e e-mail");
      } else if (whatsappOk) {
        toast.success("Convite enviado pelo WhatsApp");
      } else {
        toast.success("Convite enviado por e-mail");
        toast.message("WhatsApp indisponível — configure o canal depois.");
      }
      setDone(true);
      onComplete();
      return;
    }

    // Both failed
    setBothFailed(true);
    toast.error("Não foi possível enviar agora. Você pode finalizar mesmo assim.");
  };

  const handleFinishAnyway = async () => {
    onComplete();
    onFinish();
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-success/20 blur-xl animate-pulse" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-success/10 animate-in zoom-in spin-in-12 duration-700">
            <PartyPopper className="h-10 w-10 text-success animate-bounce" />
          </div>
        </div>
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
          <h3 className="text-xl font-semibold">Pronto!</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            {isAgency
              ? "Sua consultoria está configurada e o primeiro candidato foi convidado."
              : "Sua operação está configurada e o primeiro candidato foi convidado."}
          </p>
        </div>
        <Button
          onClick={onFinish}
          size="lg"
          className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300"
        >
          Ir para o dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold">Convide o primeiro candidato</h3>
        <p className="text-sm text-muted-foreground">
          Envie um teste de triagem por WhatsApp e veja o fluxo completo.
        </p>
      </div>

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label>Nome do candidato *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>WhatsApp *</Label>
          <Input
            value={whatsapp}
            onChange={(e) => setWhatsapp(formatWhatsApp(e.target.value))}
            placeholder="+55 11 99999-9999"
          />
          {whatsapp.length > 0 && !phoneValid && (
            <p className="text-destructive text-xs">
              Inclua DDI + DDD + número (mín. 12 dígitos)
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>E-mail (opcional)</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemplo.com"
          />
          {emailError && (
            <p className="text-destructive text-xs">E-mail inválido</p>
          )}
        </div>
      </div>

      {bothFailed && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="flex-1">
            <p className="font-medium">Envio indisponível no momento</p>
            <p className="text-muted-foreground text-xs mt-1">
              O canal de WhatsApp ainda não está configurado. Você pode tentar
              novamente, pular esta etapa ou finalizar a configuração mesmo assim
              — depois é possível convidar candidatos pelo módulo de Recrutamento.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        <Button variant="ghost" onClick={onSkip} disabled={sending}>
          <SkipForward className="h-4 w-4" />
          Pular
        </Button>
        <div className="flex items-center gap-2">
          {bothFailed && (
            <Button variant="outline" onClick={handleFinishAnyway} disabled={sending}>
              Concluir mesmo assim
            </Button>
          )}
          <Button
            onClick={handleSend}
            disabled={sending || !name.trim() || !phoneValid}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {bothFailed ? "Tentar novamente" : "Enviar convite"}
          </Button>
        </div>
      </div>
    </div>
  );
}
