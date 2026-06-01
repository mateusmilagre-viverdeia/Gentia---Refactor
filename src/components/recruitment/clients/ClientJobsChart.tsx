import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { subMonths, startOfMonth } from "date-fns";
import { TrendingUp } from "lucide-react";
import { formatBRT } from "@/lib/datetime";

interface Props {
  clientId: string;
}

export function ClientJobsChart({ clientId }: Props) {
  const { data = [] } = useQuery({
    queryKey: ["client-jobs-chart", clientId],
    queryFn: async () => {
      const sixMonthsAgo = subMonths(startOfMonth(new Date()), 5);
      const { data: jobs } = await supabase
        .from("recruitment_jobs")
        .select("created_at, status, data_contratacao")
        .eq("cliente_id", clientId)
        .gte("created_at", sixMonthsAgo.toISOString());

      // Group by month
      const months: Record<string, { abertas: number; fechadas: number; label: string }> = {};
      for (let i = 5; i >= 0; i--) {
        const m = subMonths(startOfMonth(new Date()), i);
        const key = formatBRT(m, "yyyy-MM");
        months[key] = { abertas: 0, fechadas: 0, label: formatBRT(m, "MMM") };
      }

      (jobs || []).forEach((j) => {
        const key = formatBRT(new Date(j.created_at), "yyyy-MM");
        if (months[key]) months[key].abertas += 1;
        if (j.data_contratacao) {
          const fk = formatBRT(new Date(j.data_contratacao), "yyyy-MM");
          if (months[fk]) months[fk].fechadas += 1;
        }
      });

      return Object.values(months);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" /> Vagas (últimos 6 meses)
        </CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="label" fontSize={12} stroke="hsl(var(--muted-foreground))" />
            <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="abertas" fill="hsl(var(--primary))" name="Abertas" radius={[4, 4, 0, 0]} />
            <Bar dataKey="fechadas" fill="hsl(var(--chart-2, 142 76% 36%))" name="Fechadas" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
