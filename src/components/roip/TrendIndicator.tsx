import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendIndicatorProps {
  direction: 'up' | 'down' | 'stable';
  percentage?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const TrendIndicator = ({ 
  direction, 
  percentage, 
  showLabel = false,
  size = 'md' 
}: TrendIndicatorProps) => {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const config = {
    up: {
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      label: 'Subindo',
    },
    down: {
      icon: TrendingDown,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      label: 'Caindo',
    },
    stable: {
      icon: Minus,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      label: 'Estável',
    },
  };

  const { icon: Icon, color, bgColor, label } = config[direction];

  return (
    <div className={cn(
      'inline-flex items-center gap-1 px-2 py-1 rounded-full',
      bgColor
    )}>
      <Icon className={cn(sizeClasses[size], color)} />
      {percentage !== undefined && (
        <span className={cn(textSizeClasses[size], color, 'font-medium')}>
          {percentage > 0 ? '+' : ''}{percentage.toFixed(1)}%
        </span>
      )}
      {showLabel && (
        <span className={cn(textSizeClasses[size], color)}>
          {label}
        </span>
      )}
    </div>
  );
};
