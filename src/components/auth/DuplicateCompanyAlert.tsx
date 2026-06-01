import { useState } from "react";
import { AlertTriangle, Building2, Loader2, Mail, FileText, Send, ShieldAlert, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface DuplicateMatch {
  org_id: string;
  org_name: string;
  match_type: 'cnpj' | 'email_domain' | 'name';
  confidence: 'high' | 'medium';
}

interface DuplicateCompanyAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matches: DuplicateMatch[];
  companyName: string;
  onRequestAccess: (orgId: string, reason?: string) => Promise<void>;
  onCreateAnyway: () => void;
  loading?: boolean;
  canCreate?: boolean; // If false, blocks creation entirely (high confidence matches)
  requiresConfirmation?: boolean; // If true, requires checkbox confirmation (medium confidence only)
}

const matchTypeLabels: Record<DuplicateMatch['match_type'], { label: string; icon: React.ReactNode }> = {
  cnpj: { label: 'CNPJ', icon: <FileText className="h-3 w-3" /> },
  email_domain: { label: 'Domínio de email', icon: <Mail className="h-3 w-3" /> },
  name: { label: 'Nome similar', icon: <Building2 className="h-3 w-3" /> },
};

export function DuplicateCompanyAlert({
  open,
  onOpenChange,
  matches,
  companyName,
  onRequestAccess,
  onCreateAnyway,
  loading = false,
  canCreate = true,
  requiresConfirmation = false,
}: DuplicateCompanyAlertProps) {
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [confirmedDifferent, setConfirmedDifferent] = useState(false);

  const handleRequestAccess = async () => {
    if (!selectedOrg) return;
    
    setRequestingAccess(true);
    try {
      await onRequestAccess(selectedOrg, reason || undefined);
      setSelectedOrg(null);
      setReason("");
      setShowReasonInput(false);
      onOpenChange(false);
    } catch (error) {
      // Error handled in parent
    } finally {
      setRequestingAccess(false);
    }
  };

  const handleSelectOrg = (orgId: string) => {
    setSelectedOrg(orgId);
    setShowReasonInput(true);
  };

  const handleBack = () => {
    setShowReasonInput(false);
    setSelectedOrg(null);
    setReason("");
  };

  const handleCreateAnyway = () => {
    if (requiresConfirmation && !confirmedDifferent) return;
    onCreateAnyway();
  };

  const hasHighConfidenceMatch = matches.some(m => m.confidence === 'high');
  const isBlocked = !canCreate || hasHighConfidenceMatch;

  // Reset confirmation when modal opens/closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setConfirmedDifferent(false);
      setShowReasonInput(false);
      setSelectedOrg(null);
      setReason("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {isBlocked ? (
              <>
                <ShieldAlert className="h-5 w-5 text-destructive" />
                <DialogTitle>Empresa Já Cadastrada</DialogTitle>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <DialogTitle>Possível Duplicata</DialogTitle>
              </>
            )}
          </div>
          <DialogDescription>
            {showReasonInput ? (
              `Solicitar acesso à "${matches.find(m => m.org_id === selectedOrg)?.org_name}"`
            ) : isBlocked ? (
              <>
                Encontramos uma empresa que corresponde aos dados informados.
                <strong className="text-foreground"> Não é possível criar uma duplicata.</strong>
              </>
            ) : (
              <>
                Encontramos organizações que podem ser a mesma que você está tentando cadastrar: 
                <strong className="text-foreground"> "{companyName}"</strong>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {showReasonInput && selectedOrg ? (
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Você está solicitando acesso para se juntar a esta organização. 
                Os administradores serão notificados e poderão aprovar ou recusar sua solicitação.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo da solicitação (opcional)</Label>
              <Textarea
                id="reason"
                placeholder="Ex: Sou funcionário da empresa e preciso de acesso ao sistema..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {isBlocked && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-destructive">
                    Para acessar esta empresa, você deve solicitar permissão aos administradores. 
                    Não é permitido criar empresas duplicadas no sistema.
                  </p>
                </div>
              </div>
            )}
            
            <div className="space-y-3 max-h-[250px] overflow-y-auto">
              {matches.map((match) => (
                <div
                  key={match.org_id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium truncate">{match.org_name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge 
                        variant={match.confidence === 'high' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {matchTypeLabels[match.match_type].icon}
                        <span className="ml-1">{matchTypeLabels[match.match_type].label}</span>
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${match.confidence === 'high' ? 'border-destructive text-destructive' : 'border-amber-500 text-amber-600'}`}
                      >
                        {match.confidence === 'high' ? 'Alta similaridade' : 'Média similaridade'}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSelectOrg(match.org_id)}
                    disabled={loading}
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Solicitar acesso
                  </Button>
                </div>
              ))}
            </div>

            {/* Confirmation checkbox for medium confidence only */}
            {!isBlocked && requiresConfirmation && (
              <div className="flex items-start space-x-2 p-3 bg-muted/50 rounded-lg border">
                <Checkbox
                  id="confirm-different"
                  checked={confirmedDifferent}
                  onCheckedChange={(checked) => setConfirmedDifferent(checked === true)}
                  disabled={loading}
                />
                <label
                  htmlFor="confirm-different"
                  className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
                >
                  Confirmo que a empresa que estou cadastrando é <strong className="text-foreground">diferente</strong> das listadas acima e entendo que criar duplicatas pode causar problemas no sistema.
                </label>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {showReasonInput ? (
            <>
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={requestingAccess}
              >
                Voltar
              </Button>
              <Button
                onClick={handleRequestAccess}
                disabled={requestingAccess}
              >
                {requestingAccess ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar solicitação
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              {!isBlocked && (
                <Button
                  variant={requiresConfirmation ? "outline" : "default"}
                  onClick={handleCreateAnyway}
                  disabled={loading || (requiresConfirmation && !confirmedDifferent)}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    "Criar mesmo assim"
                  )}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
