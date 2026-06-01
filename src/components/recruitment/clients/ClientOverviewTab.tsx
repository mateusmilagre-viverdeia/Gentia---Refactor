import { type Client } from "@/hooks/useClients";
import { useClientContacts } from "@/hooks/useClientContacts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, DollarSign, TrendingUp, Users, Mail, Phone, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ClientJobsChart } from "./ClientJobsChart";
import { ClientNpsCard } from "./ClientNpsCard";
import { ClientROIReportsCard } from "./ClientROIReportsCard";

interface Props {
  client: Client;
  stats: { vagasAbertas: number; vagasFechadas: number; totalRecebido: number; totalAReceber: number } | null | undefined;
}

export function ClientOverviewTab({ client, stats }: Props) {
  const { data: contacts = [] } = useClientContacts(client.id);

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={Briefcase} label="Vagas abertas" value={stats?.vagasAbertas ?? 0} />
        <MetricCard icon={TrendingUp} label="Vagas fechadas" value={stats?.vagasFechadas ?? 0} />
        <MetricCard icon={DollarSign} label="Fees recebidos" value={`R$ ${(stats?.totalRecebido ?? 0).toLocaleString("pt-BR")}`} />
        <MetricCard icon={DollarSign} label="Fees a receber" value={`R$ ${(stats?.totalAReceber ?? 0).toLocaleString("pt-BR")}`} />
      </div>

      {/* Gráfico de vagas + NPS */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <ClientJobsChart clientId={client.id} />
        </div>
        <ClientNpsCard clientId={client.id} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Contatos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Contatos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum contato cadastrado</p>
            ) : (
              <div className="space-y-3">
                {contacts.map((c) => (
                  <div key={c.id} className="flex items-start justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">{c.nome}</p>
                      {c.cargo && <p className="text-xs text-muted-foreground">{c.cargo}</p>}
                      <div className="flex gap-3 mt-1">
                        {c.email && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {c.email}
                          </span>
                        )}
                        {c.whatsapp && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {c.whatsapp}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {c.eh_decisor && <Badge variant="outline" className="text-[10px]">Decisor</Badge>}
                      {c.eh_contato_principal && <Badge variant="secondary" className="text-[10px]">Principal</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acordo Comercial */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acordo Comercial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Modelo de fee</span>
              <span className="font-medium capitalize">{client.modelo_fee || "Não definido"}</span>
            </div>
            {client.fee_percentual && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee percentual</span>
                <span className="font-medium">{client.fee_percentual}%</span>
              </div>
            )}
            {client.fee_fixo && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee fixo</span>
                <span className="font-medium">R$ {client.fee_fixo.toLocaleString("pt-BR")}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prazo de entrega</span>
              <span className="font-medium">{client.prazo_entrega_dias || 15} dias úteis</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prazo de garantia</span>
              <span className="font-medium">{client.prazo_garantia_dias || 90} dias</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Relatórios de processo (ROI) */}
      <ClientROIReportsCard clientId={client.id} />
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
