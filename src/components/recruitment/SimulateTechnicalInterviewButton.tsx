import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FlaskConical, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  jobId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function SimulateTechnicalInterviewButton({ jobId, variant = "outline", size = "sm" }: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-technical-test-session", {
        body: { jobId, testerName: "Recrutador" },
      });
      if (error) throw error;
      if (!data?.success || !data?.token) {
        throw new Error(data?.message || "Falha ao criar simulação");
      }
      toast.success(`Simulação técnica criada com ${data.questionsTotal} perguntas. Abrindo...`);
      window.open(`/interview/technical/${data.token}`, "_blank", "noopener");
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível iniciar a simulação técnica");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={loading}
      title="Simular entrevista técnica (sem cobrança, não conta no funil)"
    >
      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FlaskConical className="h-4 w-4 mr-2" />}
      Simular entrevista técnica
    </Button>
  );
}
