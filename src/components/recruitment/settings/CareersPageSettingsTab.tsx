import { useNavigate } from "react-router-dom";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Settings2, Eye } from "lucide-react";
import { getPublicOrgCareersUrl } from "@/lib/publicUrl";
import { toast } from "sonner";

export function CareersPageSettingsTab() {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const orgSlug = currentOrganization?.slug || currentOrganization?.id;
  const careersPagePath = `/careers/${orgSlug}`;
  const shareableUrl = orgSlug ? getPublicOrgCareersUrl(orgSlug) : "";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Página de Carreiras
        </h2>
        <p className="text-muted-foreground">
          Configure a aparência e conteúdo da sua página pública de carreiras
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurações da Página</CardTitle>
          <CardDescription>
            Personalize o visual, conteúdo institucional, depoimentos e muito mais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Acesse o editor completo para configurar todos os aspectos da sua página de carreiras,
            incluindo conteúdo, imagens, cores, SEO e configurações de vagas.
          </p>
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate("/atracao-contratacao/recrutamento/careers-settings")}>
              <Settings2 className="h-4 w-4 mr-2" />
              Abrir Editor Completo
            </Button>
            <Button variant="outline" asChild>
              <a href={careersPagePath} target="_blank" rel="noopener noreferrer">
                <Eye className="h-4 w-4 mr-2" />
                Ver Página Pública
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Link da Página</CardTitle>
          <CardDescription>
            Compartilhe este link para que candidatos vejam suas vagas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <code className="flex-1 p-3 bg-muted rounded-md text-sm font-mono">
              {shareableUrl}
            </code>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(shareableUrl);
                toast.success("Link copiado");
              }}
            >
              Copiar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
