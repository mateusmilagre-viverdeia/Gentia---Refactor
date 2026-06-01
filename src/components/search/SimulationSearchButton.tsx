import React from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SimulationSearchButtonProps {
  onClick: () => void;
}

export function SimulationSearchButton({ onClick }: SimulationSearchButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="gap-2"
    >
      <Search className="h-4 w-4" />
      <span className="hidden sm:inline">Buscar Simulação</span>
      <span className="sm:hidden">Buscar</span>
    </Button>
  );
}
