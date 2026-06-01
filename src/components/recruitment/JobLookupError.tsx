import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, Link2 } from "lucide-react";
import type { JobLookupErrorKind } from "@/lib/jobIdSanitizer";

interface JobLookupErrorProps {
  kind: JobLookupErrorKind;
  /** Slug da página de carreiras da empresa, se conhecido. */
  careersSlug?: string | null;
  /** Nome da empresa (para o caso job_closed). */
  companyName?: string | null;
}

const COPY: Record<
  JobLookupErrorKind,
  { title: string; description: string; icon: typeof AlertCircle }
> = {
  invalid_link: {
    title: "Link inválido ou incompleto",
    description:
      "O link desta vaga parece ter sido cortado ou copiado parcialmente. Peça novamente o link completo a quem te enviou ou veja todas as vagas abertas abaixo.",
    icon: Link2,
  },
  job_closed: {
    title: "Esta vaga já foi encerrada",
    description:
      "O processo seletivo para esta vaga não está mais aceitando candidaturas. Veja outras oportunidades abertas abaixo.",
    icon: AlertCircle,
  },
  not_found: {
    title: "Vaga não encontrada",
    description:
      "Esta vaga pode ter sido fechada ou não está mais disponível. Confira o link e tente novamente.",
    icon: AlertCircle,
  },
};

export function JobLookupError({ kind, careersSlug, companyName }: JobLookupErrorProps) {
  const navigate = useNavigate();
  const { title, description, icon: Icon } = COPY[kind];

  const careersHref = careersSlug ? `/c/${careersSlug}` : "/";

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-8">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Icon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">{title}</h2>
          <p className="text-muted-foreground mb-6">{description}</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              variant="default"
              onClick={() => navigate(careersHref)}
              className="gap-2"
            >
              {careersSlug
                ? `Ver vagas${companyName ? ` de ${companyName}` : ""}`
                : "Ver todas as vagas"}
            </Button>
            <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao início
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
