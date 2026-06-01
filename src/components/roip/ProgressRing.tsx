import { motion } from 'framer-motion';

interface ProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
}

export const ProgressRing = ({ value, size = 160, strokeWidth = 12 }: ProgressRingProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  const getColor = (val: number) => {
    if (val < 60) return 'hsl(var(--destructive))';
    if (val < 80) return 'hsl(45 93% 47%)';
    return 'hsl(142 76% 36%)';
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor(value)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-4xl font-bold"
        >
          {Math.round(value)}%
        </motion.span>
        <span className="text-sm text-muted-foreground">Maturidade</span>
      </div>
    </div>
  );
};
