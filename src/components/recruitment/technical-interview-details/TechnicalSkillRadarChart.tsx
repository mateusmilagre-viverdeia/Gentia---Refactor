import { useMemo } from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from 'recharts';

interface TechnicalSkillRadarChartProps {
  skillScores: Record<string, number>;
  skillLevels?: Record<string, string>;
}

export function TechnicalSkillRadarChart({ skillScores, skillLevels }: TechnicalSkillRadarChartProps) {
  const data = useMemo(() => {
    return Object.entries(skillScores).map(([skill, score]) => ({
      skill: skill.length > 12 ? skill.substring(0, 10) + '...' : skill,
      fullSkill: skill,
      score: Math.round(score),
      level: skillLevels?.[skill] || 'N/A',
      fullMark: 100,
    }));
  }, [skillScores, skillLevels]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Nenhuma skill avaliada
      </div>
    );
  }

  // For less than 3 skills, radar chart doesn't work well
  if (data.length < 3) {
    return (
      <div className="space-y-4">
        {data.map((item) => (
          <div key={item.fullSkill} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{item.fullSkill}</span>
              <span className="text-muted-foreground">{item.score}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${item.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
        <PolarGrid 
          stroke="hsl(var(--border))" 
          strokeOpacity={0.5}
        />
        <PolarAngleAxis 
          dataKey="skill" 
          tick={{ 
            fill: 'hsl(var(--muted-foreground))', 
            fontSize: 11,
          }}
          tickLine={false}
        />
        <PolarRadiusAxis 
          angle={90} 
          domain={[0, 100]} 
          tick={{ 
            fill: 'hsl(var(--muted-foreground))', 
            fontSize: 10 
          }}
          tickCount={5}
          axisLine={false}
        />
        <Radar
          name="Score"
          dataKey="score"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary))"
          fillOpacity={0.3}
          strokeWidth={2}
        />
        <Tooltip
          content={({ payload }) => {
            if (!payload || payload.length === 0) return null;
            const item = payload[0].payload;
            return (
              <div className="bg-popover border rounded-lg shadow-lg p-3">
                <p className="font-medium">{item.fullSkill}</p>
                <p className="text-sm text-muted-foreground">
                  Score: <span className="font-medium text-foreground">{item.score}%</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Nível: <span className="font-medium text-foreground capitalize">{item.level}</span>
                </p>
              </div>
            );
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
