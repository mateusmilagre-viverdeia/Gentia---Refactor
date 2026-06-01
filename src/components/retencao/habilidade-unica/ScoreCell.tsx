import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SKILL_LABELS, VALUE_LABELS } from '@/types/unique-ability.types';

interface ScoreCellProps {
  value: number | null;
  onChange: (value: number) => void;
  type: 'skill' | 'value';
}

export function ScoreCell({ value, onChange, type }: ScoreCellProps) {
  const labels = type === 'skill' ? SKILL_LABELS : VALUE_LABELS;

  return (
    <TooltipProvider>
      <Select
        value={value?.toString() || ''}
        onValueChange={(v) => onChange(parseInt(v, 10))}
      >
        <SelectTrigger className="w-[100px] h-9 bg-gray-50 border-gray-200">
          <SelectValue placeholder="-" />
        </SelectTrigger>
        <SelectContent>
          {[1, 2, 3, 4].map((score) => (
            <Tooltip key={score}>
              <TooltipTrigger asChild>
                <SelectItem value={score.toString()} className="cursor-pointer">
                  <span className="font-medium">{score}</span>
                  <span className="ml-2 text-muted-foreground text-xs">
                    - {labels[score]}
                  </span>
                </SelectItem>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-medium">{labels[score]}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </SelectContent>
      </Select>
    </TooltipProvider>
  );
}
