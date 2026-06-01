import { cn } from '@/lib/utils';
import { DEVELOPMENT_CATEGORIES } from '@/types/development.types';

interface DevelopmentBadgeProps {
  label: string;
  category: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function DevelopmentBadge({
  label,
  category,
  selected = false,
  onClick,
  className,
}: DevelopmentBadgeProps) {
  const categoryConfig = DEVELOPMENT_CATEGORIES.find(c => c.id === category);
  const icon = categoryConfig?.icon || '📋';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200 text-left',
        'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20',
        selected
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background text-foreground border-border hover:border-primary/50',
        className
      )}
    >
      <span className="mr-2">{icon}</span>
      {label}
    </button>
  );
}
