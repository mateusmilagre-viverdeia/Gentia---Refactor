import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ActivityRow } from './ActivityRow';
import { SKILL_LABELS, VALUE_LABELS } from '@/types/unique-ability.types';
import type { UniqueAbilityActivity } from '@/types/unique-ability.types';

interface ActivitiesTableProps {
  activities: UniqueAbilityActivity[];
  onAddActivity: (name: string) => Promise<UniqueAbilityActivity | null>;
  onUpdateActivity: (id: string, updates: Partial<Pick<UniqueAbilityActivity, 'name' | 'skill_score' | 'value_score'>>) => void;
  onDeleteActivity: (id: string) => void;
}

export function ActivitiesTable({
  activities,
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity
}: ActivitiesTableProps) {
  const [newActivityName, setNewActivityName] = useState('');

  const handleAddActivity = async () => {
    if (!newActivityName.trim()) return;
    await onAddActivity(newActivityName.trim());
    setNewActivityName('');
  };

  return (
    <TooltipProvider>
      <div className="rounded-lg overflow-hidden border border-gray-300 shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="bg-[hsl(220,40%,20%)] text-white">
              <th className="p-4 text-left font-semibold">NOME DA ATIVIDADE</th>
              <th className="p-4 text-center font-semibold w-[140px]">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help border-b border-dashed border-white/50">
                      HABILIDADE
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="font-bold mb-2">Escala de Habilidade:</p>
                    <ul className="space-y-1 text-sm">
                      {Object.entries(SKILL_LABELS).map(([score, label]) => (
                        <li key={score}><strong>{score}</strong> - {label}</li>
                      ))}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </th>
              <th className="p-4 text-center font-semibold w-[140px]">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help border-b border-dashed border-white/50">
                      VALOR
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="font-bold mb-2">Escala de Valor:</p>
                    <ul className="space-y-1 text-sm">
                      {Object.entries(VALUE_LABELS).map(([score, label]) => (
                        <li key={score}><strong>{score}</strong> - {label}</li>
                      ))}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </th>
              <th className="p-4 text-center font-semibold w-[120px]">RESULTADO</th>
              <th className="p-4 text-center w-[60px]"></th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {activities.map((activity) => (
              <ActivityRow
                key={activity.id}
                activity={activity}
                onUpdate={onUpdateActivity}
                onDelete={onDeleteActivity}
              />
            ))}
            <tr className="border-t border-gray-200 bg-gray-50">
              <td colSpan={5} className="p-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={newActivityName}
                    onChange={(e) => setNewActivityName(e.target.value)}
                    placeholder="Digite o nome da atividade..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddActivity();
                    }}
                  />
                  <Button
                    onClick={handleAddActivity}
                    disabled={!newActivityName.trim()}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  );
}
