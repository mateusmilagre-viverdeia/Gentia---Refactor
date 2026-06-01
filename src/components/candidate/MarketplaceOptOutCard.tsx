import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Eye, Building2, ShieldCheck } from "lucide-react";
import { CandidatePreferences, CandidateStats } from "@/hooks/useCandidatePreferences";

interface MarketplaceOptOutCardProps {
  preferences: CandidatePreferences;
  stats: CandidateStats;
  onUpdate: (allowSharing: boolean, reason?: string) => Promise<boolean>;
  loading?: boolean;
}

export function MarketplaceOptOutCard({
  preferences,
  stats,
  onUpdate,
  loading = false,
}: MarketplaceOptOutCardProps) {
  const [allowSharing, setAllowSharing] = useState(preferences.allow_marketplace_sharing);
  const [reason, setReason] = useState(preferences.opt_out_reason || "");
  const [showReason, setShowReason] = useState(false);
  const [saving, setSaving] = useState(false);

  const hasChanges = allowSharing !== preferences.allow_marketplace_sharing;

  const handleToggle = (checked: boolean) => {
    setAllowSharing(checked);
    if (!checked) {
      setShowReason(true);
    } else {
      setShowReason(false);
      setReason("");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const success = await onUpdate(allowSharing, !allowSharing ? reason : undefined);
    if (success) {
      setShowReason(false);
    }
    setSaving(false);
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <CardTitle>Compartilhamento de Perfil</CardTitle>
        </div>
        <CardDescription>
          Gerencie como seu perfil é compartilhado com empresas parceiras
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggle Section */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-muted/50">
          <div className="space-y-1">
            <Label htmlFor="marketplace-toggle" className="text-base font-medium">
              Permitir compartilhamento do perfil
            </Label>
            <p className="text-sm text-muted-foreground">
              Ao ativar, empresas com fit cultural similar poderão ver seu perfil
              anonimizado (skills, experiência, DISC). Seus dados pessoais só são
              revelados se a empresa demonstrar interesse.
            </p>
          </div>
          <Switch
            id="marketplace-toggle"
            checked={allowSharing}
            onCheckedChange={handleToggle}
            disabled={loading || saving}
          />
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 rounded-lg border border-border">
            <div className="p-2 rounded-full bg-primary/10">
              <Eye className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total_views}</p>
              <p className="text-xs text-muted-foreground">Visualizações</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg border border-border">
            <div className="p-2 rounded-full bg-primary/10">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.interested_companies}</p>
              <p className="text-xs text-muted-foreground">Empresas interessadas</p>
            </div>
          </div>
        </div>

        {/* Warning when opting out */}
        {showReason && !allowSharing && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-destructive">Tem certeza?</p>
                <p className="text-muted-foreground mt-1">
                  Ao desativar, seu perfil será removido do Talent Pool e empresas não
                  poderão mais encontrá-lo. Você pode reativar a qualquer momento.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="opt-out-reason">
                Motivo (opcional)
              </Label>
              <Textarea
                id="opt-out-reason"
                placeholder="Conte-nos por que você está saindo..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Save Button */}
        {hasChanges && (
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSave}
              disabled={saving || loading}
            >
              {saving ? "Salvando..." : "Salvar Preferências"}
            </Button>
          </div>
        )}

        {/* Privacy Notice */}
        <div className="text-xs text-muted-foreground border-t border-border pt-4">
          <p>
            <strong>Sua privacidade é importante:</strong> Seu perfil é exibido de forma
            anônima. Empresas só veem suas habilidades, experiência e perfil comportamental.
            Seus dados pessoais (nome, email, telefone) só são compartilhados quando você
            autoriza explicitamente.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
