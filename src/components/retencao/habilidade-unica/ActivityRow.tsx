import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, Pencil, Check, X } from 'lucide-react';
import { ScoreCell } from './ScoreCell';
import { ResultCell } from './ResultCell';
import type { UniqueAbilityActivity } from '@/types/unique-ability.types';

interface ActivityRowProps {
  activity: UniqueAbilityActivity;
  onUpdate: (id: string, updates: Partial<Pick<UniqueAbilityActivity, 'name' | 'skill_score' | 'value_score'>>) => void;
  onDelete: (id: string) => void;
}

export function ActivityRow({ activity, onUpdate, onDelete }: ActivityRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(activity.name);

  const handleSaveName = () => {
    if (editName.trim() && editName !== activity.name) {
      onUpdate(activity.id, { name: editName.trim() });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(activity.name);
    setIsEditing(false);
  };

  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50/50">
      <td className="p-3">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-8"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') handleCancelEdit();
              }}
            />
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveName}>
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelEdit}>
              <X className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-medium">{activity.name}</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        )}
      </td>
      <td className="p-3 text-center">
        <ScoreCell
          type="skill"
          value={activity.skill_score}
          onChange={(value) => onUpdate(activity.id, { skill_score: value })}
        />
      </td>
      <td className="p-3 text-center">
        <ScoreCell
          type="value"
          value={activity.value_score}
          onChange={(value) => onUpdate(activity.id, { value_score: value })}
        />
      </td>
      <td className="p-3 text-center">
        <ResultCell
          skillScore={activity.skill_score}
          valueScore={activity.value_score}
        />
      </td>
      <td className="p-3 text-center">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(activity.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}
