import { getTrafficLight, TRAFFIC_LIGHT_CONFIG } from '@/types/unique-ability.types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ResultCellProps {
  skillScore: number | null;
  valueScore: number | null;
}

export function ResultCell({ skillScore, valueScore }: ResultCellProps) {
  if (skillScore === null || valueScore === null) {
    return (
      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        <span className="font-medium">-</span>
        <div className="w-4 h-4 rounded-full bg-gray-300" />
      </div>
    );
  }

  const total = skillScore + valueScore;
  const color = getTrafficLight(total);
  const config = TRAFFIC_LIGHT_CONFIG[color];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center gap-2 cursor-help">
            <span className="font-bold text-lg">{total}</span>
            <div className={`w-5 h-5 rounded-full ${config.bgColor} shadow-md`} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          <p className="font-bold">{config.title}</p>
          <p className="text-sm mt-1">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
