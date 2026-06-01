import { cn } from "@/lib/utils";

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
  showPercentage?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'accent';
  gradient?: boolean;
  children?: React.ReactNode;
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  className,
  showPercentage = true,
  color = 'primary',
  gradient = false,
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;

  const colorClasses = {
    primary: 'stroke-primary',
    success: 'stroke-green-500',
    warning: 'stroke-yellow-500',
    accent: 'stroke-accent',
  };

  const gradientId = `progress-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {gradient && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>
        )}
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke={gradient ? `url(#${gradientId})` : undefined}
          className={cn(
            "transition-all duration-500 ease-out",
            !gradient && colorClasses[color]
          )}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children ? (
          children
        ) : showPercentage ? (
          <span className="text-lg font-bold text-foreground">
            {Math.round(progress)}%
          </span>
        ) : null}
      </div>
    </div>
  );
}
