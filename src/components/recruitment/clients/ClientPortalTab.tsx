import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type Client } from "@/hooks/useClients";
import { useAccount } from "@/hooks/useAccount";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Key } from "lucide-react";
import { toast } from "sonner";
import { parseISO } from "date-fns";
import { ClientPortalActivityTab } from "./ClientPortalActivityTab";
import { EmployerAccountCard } from "./EmployerAccountCard";
import { formatBRT } from "@/lib/datetime";

interface Props {
  client: Client;
}

export function ClientPortalTab({ client }: Props) {
  const { account } = useAccount();
  const { data: accesses = [], isLoading } = useQuery({
    queryKey: ["portal-access", client.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_clientes_acesso")
        .select("*")
        .eq("cliente_id", client.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!client.id,
  });

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  return (
    <div className="space-y-4">
      <ClientPortalActivityTab clientId={client.id} />
      {account?.id && <EmployerAccountCard clientId={client.id} agencyAccountId={account.id} />}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" /> Acessos ao Portal
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : accesses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum acesso criado ainda. O portal será implementado na próxima fase.</p>
          ) : (
            <div className="space-y-3">
              {accesses.map((access: any) => (
                <div key={access.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">{access.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Último acesso: {access.ultimo_acesso ? formatBRT(parseISO(access.ultimo_acesso), "dd/MM/yyyy HH:mm") : "Nunca"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={access.ativo ? "default" : "secondary"}>
                      {access.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => copyLink(access.token_acesso)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
