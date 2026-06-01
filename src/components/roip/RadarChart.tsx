import { motion } from 'framer-motion';
import type { PillarScore } from '@/store/assessmentStore';

interface RadarChartProps {
  pillarScores: PillarScore[];
}

export const RadarChart = ({ pillarScores }: RadarChartProps) => {
  // Dynamically create pillars from pillarScores with equal angle distribution
  const pillars = pillarScores.map((p, index) => ({
    name: p.name,
    angle: (360 / pillarScores.length) * index,
    score: p.score,
    benchmark: p.benchmark,
  }));

  const size = 400;
  const center = size / 2;
  const maxRadius = size / 2 - 60;

  const getPoint = (angle: number, value: number) => {
    const radius = (value / 100) * maxRadius;
    const radian = ((angle - 90) * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(radian),
      y: center + radius * Math.sin(radian),
    };
  };

  const actualPoints = pillars.map(p => getPoint(p.angle, p.score));
  const benchmarkPoints = pillars.map(p => getPoint(p.angle, p.benchmark));

  const actualPath = actualPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
  const benchmarkPath = benchmarkPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <div className="flex justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid circles */}
        {[20, 40, 60, 80, 100].map(percent => (
          <circle
            key={percent}
            cx={center}
            cy={center}
            r={(percent / 100) * maxRadius}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={1}
            strokeDasharray={percent === 100 ? 'none' : '4 4'}
          />
        ))}

        {/* Grid lines */}
        {pillars.map((pillar, i) => {
          const endPoint = getPoint(pillar.angle, 100);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={endPoint.x}
              y2={endPoint.y}
              stroke="hsl(var(--border))"
              strokeWidth={1}
            />
          );
        })}

        {/* Benchmark polygon (dashed) */}
        <path
          d={benchmarkPath}
          fill="hsl(var(--muted-foreground) / 0.1)"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={2}
          strokeDasharray="8 4"
        />

        {/* Actual polygon */}
        <motion.path
          d={actualPath}
          fill="hsl(var(--primary) / 0.2)"
          stroke="hsl(var(--primary))"
          strokeWidth={3}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
        />

        {/* Data points */}
        {actualPoints.map((point, i) => (
          <motion.circle
            key={i}
            cx={point.x}
            cy={point.y}
            r={6}
            fill="hsl(var(--primary))"
            stroke="hsl(var(--background))"
            strokeWidth={2}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 + i * 0.1 }}
          />
        ))}

        {/* Labels */}
        {pillars.map((pillar, i) => {
          const labelPoint = getPoint(pillar.angle, 115);
          return (
            <text
              key={i}
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs font-medium fill-foreground"
            >
              {pillar.name}
              <tspan x={labelPoint.x} dy="14" className="text-xs fill-muted-foreground">
                {Math.round(pillar.score)}%
              </tspan>
            </text>
          );
        })}
      </svg>
    </div>
  );
};
