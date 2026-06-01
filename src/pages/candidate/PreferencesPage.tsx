import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, ShieldAlert, UserCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCandidatePreferences } from "@/hooks/useCandidatePreferences";
import { MarketplaceOptOutCard } from "@/components/candidate/MarketplaceOptOutCard";
import { CandidateEngagementDashboard } from "@/components/candidate/CandidateEngagementDashboard";

export default function CandidatePreferencesPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const { loading, data, error, fetchPreferences, updatePreferences } = useCandidatePreferences();

  useEffect(() => {
    if (token) {
      fetchPreferences(token);
    }
  }, [token]);

  // No token provided
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Link Inválido</CardTitle>
            <CardDescription>
              Este link não contém um token válido. Por favor, use o link enviado
              por email para acessar suas preferências.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Loading state
  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Carregando suas preferências...</p>
        </div>
      </div>
    );
  }

  // Error state (invalid/expired token)
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Token Expirado</CardTitle>
            <CardDescription>
              {error || "Este link expirou ou não é mais válido."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Se você ainda deseja gerenciar suas preferências, entre em contato
              com o RH da empresa onde você se candidatou para solicitar um novo link.
            </p>
            <Button variant="outline" asChild>
              <a href="mailto:suporte@gentia.com.br">Contatar Suporte</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleUpdate = async (allowSharing: boolean, reason?: string) => {
    return updatePreferences(token, allowSharing, reason);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <UserCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Olá, {data.candidate.name}!</h1>
              <p className="text-sm text-muted-foreground">{data.candidate.email}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Introduction */}
        <div className="prose prose-sm dark:prose-invert">
          <p className="text-muted-foreground">
            Você participou de processos seletivos onde seu perfil cultural foi avaliado
            positivamente. Empresas parceiras podem ter interesse em conhecer você através
            do nosso <strong>Talent Pool</strong> - uma forma segura e anônima de conectar
            talentos a oportunidades.
          </p>
        </div>

        {/* Engagement Dashboard */}
        <CandidateEngagementDashboard token={token} />

        {/* Opt-Out Card */}
        <MarketplaceOptOutCard
          preferences={data.preferences}
          stats={data.stats}
          onUpdate={handleUpdate}
          loading={loading}
        />

        {/* LGPD Notice */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium mb-2">Seus Direitos (LGPD)</h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Você pode optar por sair do Talent Pool a qualquer momento</li>
              <li>• Seus dados pessoais nunca são compartilhados sem seu consentimento</li>
              <li>• Você pode solicitar a exclusão completa dos seus dados</li>
              <li>• Para dúvidas sobre privacidade, contate: privacidade@gentia.com.br</li>
            </ul>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="container max-w-2xl mx-auto px-4 py-6 text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Gent.IA - Plataforma de Gestão de Pessoas</p>
        </div>
      </footer>
    </div>
  );
}
