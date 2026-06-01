import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, UserPlus, Send, Clock, Mail } from "lucide-react";
import { useEmployerAccount } from "@/hooks/useEmployerAccount";
import { useClientContacts } from "@/hooks/useClientContacts";
import { parseISO } from "date-fns";
import { formatBRT } from "@/lib/datetime";

interface Props {
  clientId: string;
  agencyAccountId: string;
}

export function EmployerAccountCard({ clientId, agencyAccountId }: Props) {
  const { data: employer, isLoading, createEmployer, isCreating } = useEmployerAccount(clientId, agencyAccountId);
  const { data: contacts = [] } = useClientContacts(clientId);

  const principalContact = contacts.find((c: any) => c.eh_contato_principal && c.email) || contacts.find((c: any) => c.email);
  const hasAccess = !!(employer as any)?.last_access_at;

  const handleCreate = () => {
    if (!principalContact?.email) return;
    createEmployer({
      contact_email: principalContact.email,
      contact_name: principalContact.nome,
      contact_id: principalContact.id,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" /> Conta Employer
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3 rounded-lg border p-3">
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="h-3 w-64 max-w-full animate-pulse rounded bg-muted" />
            <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          </div>
        ) : employer ? (
          <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">{employer.name}</p>
              <p className="text-xs text-muted-foreground">
                Criada em {formatBRT(parseISO(employer.created_at), "dd/MM/yyyy")}
              </p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {hasAccess
                  ? `Último acesso em ${formatBRT(parseISO((employer as any).last_access_at), "dd/MM/yyyy")}`
                  : "Conta criada — aguardando primeiro acesso"}
              </p>
              {principalContact?.email && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" /> Convite para {principalContact.email}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={hasAccess ? "default" : "secondary"}>{hasAccess ? "Ativa" : "Convite enviado"}</Badge>
              <Button variant="outline" size="sm" onClick={handleCreate} disabled={isCreating || !principalContact?.email}>
                <Send className="h-3.5 w-3.5 mr-1" /> Reenviar convite
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Crie uma conta employer para que o cliente acesse o sistema com login próprio (visão simplificada de vagas, candidatos aprovados e relatórios).
            </p>
            {!principalContact?.email && (
              <p className="text-xs text-destructive">
                Cadastre um contato principal com e-mail antes de criar a conta Employer.
              </p>
            )}
            {principalContact?.email && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" /> O convite será enviado para {principalContact.email}
              </p>
            )}
            <Button onClick={handleCreate} disabled={isCreating || !principalContact?.email}>
              <UserPlus className="h-4 w-4 mr-2" />
              {isCreating ? "Criando..." : "Criar conta employer"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
