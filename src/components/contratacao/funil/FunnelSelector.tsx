import { Plus, ChevronDown, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HiringFunnel } from '@/types/hiring-funnel.types';

interface FunnelSelectorProps {
  funnels: HiringFunnel[];
  selectedFunnel: HiringFunnel | null;
  onSelect: (funnel: HiringFunnel) => void;
  onCreateNew: () => void;
}

export function FunnelSelector({ funnels, selectedFunnel, onSelect, onCreateNew }: FunnelSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="min-w-[200px] justify-between">
          <span className="truncate">
            {selectedFunnel?.name || 'Selecionar Funil'}
          </span>
          <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        {funnels.map((funnel) => (
          <DropdownMenuItem
            key={funnel.id}
            onClick={() => onSelect(funnel)}
            className="flex items-center gap-2"
          >
            {funnel.is_default && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
            <span className="truncate">{funnel.name}</span>
          </DropdownMenuItem>
        ))}
        {funnels.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuItem onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Funil
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
