import { useSearchParams, useParams, Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CareersApplySuccessPage() {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const vaga = params.get("vaga") || "";

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Candidatura enviada!</h1>
          <p className="text-muted-foreground mt-2">
            {vaga ? `Recebemos sua candidatura para "${vaga}".` : "Recebemos sua candidatura."} Você receberá um email de confirmação em instantes.
          </p>
          <p className="text-sm text-muted-foreground mt-3">
            Nossa equipe analisará seu perfil e, havendo fit, entrará em contato pelos próximos passos.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to={`/c/${slug}`}>Ver outras vagas</Link>
        </Button>
      </div>
    </div>
  );
}
