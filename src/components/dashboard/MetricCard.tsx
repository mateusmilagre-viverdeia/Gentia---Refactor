import React from 'react';
import { formatarMoeda, formatarPercentual } from '@/utils/formatters';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: number;
  type: 'currency' | 'percentage' | 'number';
  variant: 'positive' | 'negative' | 'neutral' | 'warning';
  benchmark?: number;
  showDetail?: boolean;
  onDetailClick?: () => void;
  subtitle?: string | React.ReactNode;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  type,
  variant,
  benchmark,
  showDetail = false,
  onDetailClick,
  subtitle,
  className = ''
}) => {
  const formatValue = (val: number) => {
    switch (type) {
      case 'currency':
        return formatarMoeda(val);
      case 'percentage':
        return formatarPercentual(val);
      case 'number':
        return val.toLocaleString('pt-BR');
      default:
        return val.toString();
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'positive':
        return 'border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950/20';
      case 'negative':
        return 'border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/20';
      case 'neutral':
        return 'border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/20';
      case 'warning':
        return 'border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-950/20';
      default:
        return 'border-l-4 border-l-gray-500 bg-gray-50 dark:bg-gray-950/20';
    }
  };

  const getTextColorClass = () => {
    switch (variant) {
      case 'positive':
        return 'text-green-700 dark:text-green-400';
      case 'negative':
        return 'text-red-700 dark:text-red-400';
      case 'neutral':
        return 'text-blue-700 dark:text-blue-400';
      case 'warning':
        return 'text-orange-700 dark:text-orange-400';
      default:
        return 'text-gray-700 dark:text-gray-400';
    }
  };

  return (
    <Card className={cn(getVariantClasses(), className)}>
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            {title}
          </span>
          {showDetail && onDetailClick && (
            <Button variant="ghost" size="sm" onClick={onDetailClick} className="text-xs">
              Ver Detalhamento
            </Button>
          )}
        </div>
        
        <p className={cn('text-2xl font-bold', getTextColorClass())}>
          {formatValue(value)}
        </p>

        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}

        {benchmark !== undefined && (
          <p className="text-xs text-muted-foreground mt-2">
            Benchmark do setor:{' '}
            <span className="font-medium">
              {formatValue(benchmark)}
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
};
