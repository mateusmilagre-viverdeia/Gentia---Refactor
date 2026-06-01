interface AgentCriterion {
  id: string;
  name: string;
  description: string;
  minimumScore: number;
  importance: "minor" | "moderate" | "important" | "very_important" | "critical";
  weight: number;
  color: string;
}

interface AgentOverviewTabProps {
  minimumScore: number;
  criteria: AgentCriterion[];
}

const importanceLabels: Record<string, string> = {
  minor: "Baixa (x1)",
  moderate: "Moderada (x2)",
  important: "Importante (x3)",
  very_important: "Muito Importante (x4)",
  critical: "Crítica (x5)",
};

const criteriaColors = [
  "bg-red-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-orange-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-cyan-500",
];

export const AgentOverviewTab = ({ minimumScore, criteria }: AgentOverviewTabProps) => {
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  const criteriaWithMinimum = criteria.filter((c) => c.minimumScore > 0).length;

  const getWeightPercentage = (weight: number) => {
    return totalWeight > 0 ? ((weight / totalWeight) * 100).toFixed(1) : "0";
  };

  return (
    <div className="space-y-8">
      {/* Header metrics */}
      <div className="flex gap-8">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Padrão mínimo geral</p>
          <p className="text-2xl font-bold">
            {minimumScore} / 10{" "}
            <span className="text-sm font-normal text-muted-foreground">
              média exigida
            </span>
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Padrões individuais de critérios</p>
          <p className="text-2xl font-bold">
            {criteriaWithMinimum}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              critérios com padrões mínimos
            </span>
          </p>
        </div>
      </div>

      {/* Criteria cards - minimalist design */}
      <div className="flex flex-wrap gap-3">
        {criteria.map((criterion, index) => (
          <div
            key={criterion.id}
            className="bg-card border rounded-lg p-4 flex items-start gap-3 min-w-[180px]"
          >
            <div
              className={`w-2.5 h-2.5 rounded-full ${criteriaColors[index % criteriaColors.length]} mt-1.5 shrink-0`}
            />
            <div className="min-w-0">
              <p className="font-medium text-foreground text-sm line-clamp-2">
                {criterion.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="font-semibold text-foreground">
                  {getWeightPercentage(criterion.weight)}%
                </span>{" "}
                peso
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Score Impact Distribution */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm">Distribuição do Impacto na Nota</h4>
        <div className="h-5 flex rounded-lg overflow-hidden">
          {criteria.map((criterion, index) => (
            <div
              key={criterion.id}
              className={`${criteriaColors[index % criteriaColors.length]} opacity-80`}
              style={{ width: `${getWeightPercentage(criterion.weight)}%` }}
              title={`${criterion.name}: ${getWeightPercentage(criterion.weight)}%`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
          {criteria.map((criterion, index) => (
            <div key={criterion.id} className="flex items-center gap-2 text-xs">
              <div
                className={`w-2.5 h-2.5 rounded-full ${criteriaColors[index % criteriaColors.length]}`}
              />
              <span className="text-muted-foreground">
                {criterion.name} ({getWeightPercentage(criterion.weight)}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm">Detalhamento</h4>
          <span className="text-xs text-muted-foreground">
            ({criteria.length} critérios)
          </span>
        </div>

        <div className="space-y-2">
          {criteria.map((criterion, index) => (
            <div
              key={criterion.id}
              className="flex items-start gap-4 p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
            >
              <div
                className={`w-2.5 h-2.5 rounded-full ${criteriaColors[index % criteriaColors.length]} shrink-0 mt-1.5`}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{criterion.name}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  {criterion.description || "Nenhuma descrição fornecida"}
                </p>
              </div>
              <div className="flex gap-6 text-xs shrink-0">
                <div className="text-center">
                  <p className="text-muted-foreground">Importância</p>
                  <p className="font-medium mt-0.5">{importanceLabels[criterion.importance]}</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">Nota mínima</p>
                  <p className="font-medium mt-0.5">{criterion.minimumScore} / 10</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">Impacto</p>
                  <p className="font-semibold text-foreground mt-0.5">
                    {getWeightPercentage(criterion.weight)}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
