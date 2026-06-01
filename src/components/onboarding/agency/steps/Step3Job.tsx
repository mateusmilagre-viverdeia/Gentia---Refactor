import { useState } from "react";
import { Loader2, SkipForward, Sparkles, Check, ExternalLink, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAgencyOnboarding } from "../AgencyOnboardingWizardContext";
import { toast } from "sonner";

interface Props {
  onComplete: () => void;
  onSkip: () => Promise<void>;
  mode?: "agency" | "self";
}

interface IcpPreview {
  cargo?: string;
  senioridade?: string;
  skills?: string[];
}

export function Step3Job({ onComplete, onSkip, mode = "agency" }: Props) {
  const { currentAccount } = useOrganization();
  const { clientId, setJobId } = useAgencyOnboarding();
  const isAgency = mode === "agency";
  const [title, setTitle] = useState("");
  const [jd, setJd] = useState("");
  const [creating, setCreating] = useState(false);
  const [generatingIcp, setGeneratingIcp] = useState(false);
  const [icpPreview, setIcpPreview] = useState<IcpPreview | null>(null);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!title.trim() || !jd.trim() || !currentAccount) {
      toast.error("Informe título e descrição da vaga");
      return;
    }
    setCreating(true);
    try {
      const { data: job, error } = await supabase
        .from("recruitment_jobs")
        .insert({
          account_id: currentAccount.id,
          title: title.trim(),
          description: jd.trim(),
          status: "draft",
          cliente_id: isAgency ? clientId : null,
        })
        .select("id")
        .single();
      if (error) throw error;

      setJobId(job.id);
      setCreatedJobId(job.id);
      toast.success("Vaga criada — gerando ICP...");

      // Gerar ICP e mostrar preview
      setGeneratingIcp(true);
      try {
        const { data: icpData } = await supabase.functions.invoke("generate-job-icp", {
          body: { job_id: job.id },
        });
        const icp = icpData?.icp ?? icpData ?? {};
        setIcpPreview({
          cargo: icp.cargo ?? icp.role ?? title.trim(),
          senioridade: icp.senioridade ?? icp.seniority,
          skills:
            icp.mandatory_skills ??
            icp.skills ??
            icp.must_have_skills ??
            [],
        });
      } catch (e) {
        console.warn("ICP em background falhou:", e);
        setIcpPreview({ cargo: title.trim() });
      } finally {
        setGeneratingIcp(false);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao criar vaga");
    } finally {
      setCreating(false);
    }
  };

  // Tela de preview do ICP após criação
  if (createdJobId && icpPreview) {
    return (
      <div className="space-y-5">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            ICP gerado
          </h3>
          <p className="text-sm text-muted-foreground">
            Sua vaga foi criada e o perfil ideal foi sugerido pela IA.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {icpPreview.cargo && (
            <div>
              <p className="text-xs text-muted-foreground">Cargo</p>
              <p className="font-medium">{icpPreview.cargo}</p>
            </div>
          )}
          {icpPreview.senioridade && (
            <div>
              <p className="text-xs text-muted-foreground">Senioridade</p>
              <p className="font-medium capitalize">{icpPreview.senioridade}</p>
            </div>
          )}
          {icpPreview.skills && icpPreview.skills.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Skills principais</p>
              <div className="flex flex-wrap gap-1.5">
                {icpPreview.skills.slice(0, 8).map((s, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <a
              href={`/atracao-contratacao/recrutamento/vaga/${createdJobId}`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Editar detalhes da vaga
            </a>
          </Button>
          <Button onClick={onComplete}>
            Continuar
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold">Primeira vaga</h3>
        <p className="text-sm text-muted-foreground">
          Cole a descrição. Geramos o ICP com IA em segundo plano.
        </p>
      </div>

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label>Título da vaga *</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Analista Financeiro Sênior"
          />
        </div>
        <div className="space-y-2">
          <Label>Descrição completa *</Label>
          <Textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Cole aqui responsabilidades, requisitos, benefícios..."
            className="min-h-[200px]"
          />
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          O ICP (perfil ideal) será gerado automaticamente após criar a vaga.
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onSkip} disabled={creating || generatingIcp}>
          <SkipForward className="h-4 w-4" />
          Pular
        </Button>
        <Button
          onClick={handleCreate}
          disabled={creating || generatingIcp || !title.trim() || !jd.trim()}
        >
          {creating || generatingIcp ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {generatingIcp ? "Gerando ICP..." : "Criando..."}
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Criar vaga e gerar ICP
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
