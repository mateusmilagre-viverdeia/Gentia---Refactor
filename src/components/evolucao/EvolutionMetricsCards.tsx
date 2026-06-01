import { motion } from "framer-motion";
import { Users, Target, CheckCircle2, FileEdit } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface EvolutionMetricsCardsProps {
  totalCycles: number;
  activeCycles: number;
  completedCycles: number;
  draftCycles: number;
}

const metrics = [
  {
    key: "total",
    label: "Total de Ciclos",
    icon: Users,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    key: "active",
    label: "Ciclos Ativos",
    icon: Target,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  {
    key: "completed",
    label: "Concluídos",
    icon: CheckCircle2,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    key: "draft",
    label: "Rascunhos",
    icon: FileEdit,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  },
];

export function EvolutionMetricsCards({
  totalCycles,
  activeCycles,
  completedCycles,
  draftCycles,
}: EvolutionMetricsCardsProps) {
  const values: Record<string, number> = {
    total: totalCycles,
    active: activeCycles,
    completed: completedCycles,
    draft: draftCycles,
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <motion.div
            key={metric.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {metric.label}
                    </p>
                    <p className="text-3xl font-bold">{values[metric.key]}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${metric.bgColor}`}>
                    <Icon className={`h-6 w-6 ${metric.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
