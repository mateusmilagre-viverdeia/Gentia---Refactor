import { DISCTeamAggregation, DISC_DIMENSIONS } from '@/types/disc.types';
import { getDimensionHexColor } from '@/data/disc-team-analysis';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

interface DISCTeamRadarChartProps {
  aggregation: DISCTeamAggregation;
}

export function DISCTeamRadarChart({ aggregation }: DISCTeamRadarChartProps) {
  const { avgScores, memberCount } = aggregation;

  const chartData = [
    {
      dimension: 'D',
      fullName: DISC_DIMENSIONS.D.name,
      score: avgScores.D,
      fill: getDimensionHexColor('D')
    },
    {
      dimension: 'I',
      fullName: DISC_DIMENSIONS.I.name,
      score: avgScores.I,
      fill: getDimensionHexColor('I')
    },
    {
      dimension: 'S',
      fullName: DISC_DIMENSIONS.S.name,
      score: avgScores.S,
      fill: getDimensionHexColor('S')
    },
    {
      dimension: 'C',
      fullName: DISC_DIMENSIONS.C.name,
      score: avgScores.C,
      fill: getDimensionHexColor('C')
    }
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{data.fullName}</p>
          <p className="text-sm text-muted-foreground">
            Média: <span className="font-semibold">{data.score}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={({ x, y, payload }) => {
                const dim = payload.value as keyof typeof DISC_DIMENSIONS;
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={0}
                      y={0}
                      dy={4}
                      textAnchor="middle"
                      fill={getDimensionHexColor(dim)}
                      className="font-bold text-lg"
                    >
                      {payload.value}
                    </text>
                  </g>
                );
              }}
            />
            <PolarRadiusAxis
              angle={45}
              domain={[0, 100]}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={false}
            />
            <Radar
              name="Média do Time"
              dataKey="score"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 text-sm">
        {chartData.map((item) => (
          <div key={item.dimension} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.fill }}
            />
            <span className="text-muted-foreground">
              {item.dimension}: <span className="font-medium text-foreground">{item.score}</span>
            </span>
          </div>
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Média do time • {memberCount} {memberCount === 1 ? 'membro' : 'membros'} avaliado{memberCount === 1 ? '' : 's'}
      </p>
    </div>
  );
}
