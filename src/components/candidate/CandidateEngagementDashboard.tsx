import { useCandidateEngagement } from "@/hooks/useTalentPoolAnalytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Eye, Building2, MessageCircle, TrendingUp, Loader2, Sparkles } from "lucide-react";
import { parseISO } from "date-fns";
import { formatBRT, formatBRTRelative } from "@/lib/datetime";

interface CandidateEngagementDashboardProps {
  token: string;
}

export function CandidateEngagementDashboard({ token }: CandidateEngagementDashboardProps) {
  const { data: engagement, isLoading, error } = useCandidateEngagement(token);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error || !engagement) {
    return null; // Silently fail if no engagement data
  }

  const hasActivity = engagement.totalViews > 0 || engagement.unlockCount > 0;

  const chartData = engagement.viewsByWeek
    ?.sort((a, b) => a.week.localeCompare(b.week))
    .slice(-8)
    .map(item => ({
      ...item,
      weekLabel: formatBRT(parseISO(item.week), "dd/MM"),
    })) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Seu Engajamento no Talent Pool
        </CardTitle>
        <CardDescription>
          Veja como empresas estão interagindo com seu perfil
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasActivity ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-500/10 rounded-lg p-4 text-center">
                <Eye className="h-5 w-5 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600">
                  {engagement.totalViews}
                </div>
                <div className="text-xs text-muted-foreground">
                  Visualizações
                </div>
              </div>

              <div className="bg-purple-500/10 rounded-lg p-4 text-center">
                <Building2 className="h-5 w-5 text-purple-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-600">
                  {engagement.uniqueViewers}
                </div>
                <div className="text-xs text-muted-foreground">
                  Empresas Interessadas
                </div>
              </div>

              <div className="bg-amber-500/10 rounded-lg p-4 text-center">
                <TrendingUp className="h-5 w-5 text-amber-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-amber-600">
                  {engagement.unlockCount}
                </div>
                <div className="text-xs text-muted-foreground">
                  Desbloquearam Perfil
                </div>
              </div>

              <div className="bg-green-500/10 rounded-lg p-4 text-center">
                <MessageCircle className="h-5 w-5 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">
                  {engagement.contactsReceived}
                </div>
                <div className="text-xs text-muted-foreground">
                  Contatos Recebidos
                </div>
              </div>
            </div>

            {/* Last Viewed */}
            {engagement.lastViewedAt && (
              <div className="text-sm text-muted-foreground text-center">
                Última visualização:{" "}
                <span className="font-medium text-foreground">
                  {formatBRTRelative(new Date(engagement.lastViewedAt))}
                </span>
              </div>
            )}

            {/* Views Chart */}
            {chartData.length > 1 && (
              <div>
                <h4 className="text-sm font-medium mb-3">Visualizações por Semana</h4>
                <div className="h-[150px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis 
                        dataKey="weekLabel" 
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        width={25}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number) => [`${value} views`, "Visualizações"]}
                      />
                      <Bar 
                        dataKey="count" 
                        fill="hsl(var(--primary))" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Insights */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2">💡 O que isso significa?</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {engagement.uniqueViewers >= 3 && (
                  <li>• Seu perfil está atraindo interesse de várias empresas!</li>
                )}
                {engagement.unlockCount > 0 && (
                  <li>• Empresas pagaram créditos para ver seus dados - sinal de interesse real</li>
                )}
                {engagement.contactsReceived > 0 && (
                  <li>• Você já recebeu {engagement.contactsReceived} tentativa(s) de contato</li>
                )}
                {engagement.totalViews > 10 && engagement.unlockCount === 0 && (
                  <li>• Muitas views mas poucos unlocks? Considere atualizar seu perfil</li>
                )}
              </ul>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Eye className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Seu perfil ainda não recebeu visualizações</p>
            <p className="text-sm mt-2">
              Quando empresas visualizarem seu perfil no Talent Pool, você verá as estatísticas aqui
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
