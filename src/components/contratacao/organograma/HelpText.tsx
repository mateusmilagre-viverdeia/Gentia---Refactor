import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { CanvasMode } from '@/hooks/useCanvasMode';

interface HelpTextProps {
  mode: CanvasMode;
  selectedNodeId?: string | null;
  isFullscreen?: boolean;
  connectionSource?: string | null;
}

export function HelpText({ mode, selectedNodeId, connectionSource }: HelpTextProps) {
  const getItems = (): string[] => {
    if (mode === 'connection') {
      if (connectionSource) {
        return [
          'Clique em outro cargo para criar a conexão',
          'Esc para cancelar',
        ];
      }
      return ['Clique no cargo de origem para iniciar a conexão'];
    }
    
    if (mode === 'navigation') {
      return [
        'Arraste para mover o canvas',
        'Scroll para zoom',
      ];
    }
    
    // Selection mode
    const items = [
      'Clique em um cargo para selecionar',
      'Botão + para adicionar subordinados',
      'Arraste um cargo e solte sobre outro para mover',
    ];
    if (selectedNodeId) {
      items.push('Delete/Backspace para excluir');
      items.push('Esc para desmarcar');
    }
    return items;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          title="Ajuda"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="w-64 p-3">
        <p className="text-xs font-medium mb-2 text-foreground">Atalhos e dicas</p>
        <ul className="space-y-1">
          {getItems().map((item, i) => (
            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
              <span className="mt-1 h-1 w-1 rounded-full bg-muted-foreground/50 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
