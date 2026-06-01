import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DISCResult, DISC_DIMENSIONS } from "@/types/disc.types";

interface DISCRadarChartProps {
  result: DISCResult;
}

export function DISCRadarChart({ result }: DISCRadarChartProps) {
  const radarData = [
    { 
      dimension: 'D - Dominância', 
      score: result.d_normalized, 
      fullMark: 100,
      color: DISC_DIMENSIONS.D.bgColor
    },
    { 
      dimension: 'I - Influência', 
      score: result.i_normalized, 
      fullMark: 100,
      color: DISC_DIMENSIONS.I.bgColor
    },
    { 
      dimension: 'S - Estabilidade', 
      score: result.s_normalized, 
      fullMark: 100,
      color: DISC_DIMENSIONS.S.bgColor
    },
    { 
      dimension: 'C - Conformidade', 
      score: result.c_normalized, 
      fullMark: 100,
      color: DISC_DIMENSIONS.C.bgColor
    },
  ];

  // Get primary and secondary colors
  const primaryColor = getHexColor(DISC_DIMENSIONS[result.primary_profile].bgColor);
  const secondaryColor = result.secondary_profile 
    ? getHexColor(DISC_DIMENSIONS[result.secondary_profile].bgColor)
    : primaryColor;

  // Gradient color based on primary
  const gradientColor = primaryColor;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          Padrão Comportamental
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
              <PolarGrid 
                gridType="polygon" 
                stroke="hsl(var(--border))"
              />
              <PolarAngleAxis 
                dataKey="dimension" 
                tick={{ 
                  fill: 'hsl(var(--foreground))', 
                  fontSize: 12,
                  fontWeight: 500
                }}
                tickLine={false}
              />
              <PolarRadiusAxis 
                angle={45} 
                domain={[0, 100]} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickCount={5}
                axisLine={false}
              />
              <Radar
                name="Score"
                dataKey="score"
                stroke={gradientColor}
                fill={gradientColor}
                fillOpacity={0.3}
                strokeWidth={2}
                dot={{
                  r: 4,
                  fill: gradientColor,
                  strokeWidth: 2,
                  stroke: 'white'
                }}
                activeDot={{
                  r: 6,
                  fill: gradientColor,
                  stroke: 'white',
                  strokeWidth: 2
                }}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                        <p className="font-medium text-sm">{data.dimension}</p>
                        <p className="text-muted-foreground text-sm">
                          Score: <span className="font-bold text-foreground">{data.score.toFixed(1)}%</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend with dimension colors */}
        <div className="flex flex-wrap justify-center gap-4 mt-4">
          {(['D', 'I', 'S', 'C'] as const).map((dim) => {
            const dimInfo = DISC_DIMENSIONS[dim];
            const score = dim === 'D' ? result.d_normalized :
                         dim === 'I' ? result.i_normalized :
                         dim === 'S' ? result.s_normalized : result.c_normalized;
            const isPrimary = result.primary_profile === dim;
            const isSecondary = result.secondary_profile === dim;
            
            return (
              <div 
                key={dim} 
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                  isPrimary 
                    ? 'bg-primary/10 border-primary' 
                    : isSecondary 
                      ? 'bg-secondary border-secondary-foreground/20' 
                      : 'bg-muted/50 border-border'
                }`}
              >
                <div 
                  className={`w-3 h-3 rounded-full ${dimInfo.bgColor}`}
                />
                <span className="text-xs font-medium">
                  {dim}: {score.toFixed(0)}%
                </span>
                {isPrimary && (
                  <span className="text-[10px] font-bold text-primary uppercase">1º</span>
                )}
                {isSecondary && (
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">2º</span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper to extract hex color from Tailwind class
function getHexColor(bgClass: string): string {
  const colorMap: Record<string, string> = {
    'bg-red-500': '#ef4444',
    'bg-yellow-500': '#eab308',
    'bg-green-500': '#22c55e',
    'bg-blue-500': '#3b82f6',
  };
  return colorMap[bgClass] || '#6b7280';
}
