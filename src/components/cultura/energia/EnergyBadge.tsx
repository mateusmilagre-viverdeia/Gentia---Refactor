import { useState } from 'react';
import { ENERGY_CATEGORIES } from '@/types/energy.types';
import { Pencil, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface EnergyBadgeProps {
  label: string;
  category: string;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  isCustom?: boolean;
  onEdit?: (newLabel: string) => void;
}

export function EnergyBadge({ label, category, selected, onClick, disabled, isCustom, onEdit }: EnergyBadgeProps) {
  const categoryData = ENERGY_CATEGORIES.find(c => c.id === category);
  const bgColor = selected ? categoryData?.color || 'hsl(var(--primary))' : 'transparent';
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);

  const handleEditConfirm = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== label && onEdit) {
      onEdit(trimmed);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 px-2 py-2 rounded-lg border border-primary bg-background">
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="h-7 text-sm"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleEditConfirm();
            if (e.key === 'Escape') setEditing(false);
          }}
        />
        <button onClick={handleEditConfirm} className="p-1 text-primary hover:bg-primary/10 rounded">
          <Check className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setEditing(false)} className="p-1 text-muted-foreground hover:bg-muted rounded">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        disabled={disabled && !onEdit}
        className={`
          px-4 py-3 rounded-lg border text-sm font-medium transition-all text-left w-full
          ${selected 
            ? 'text-foreground border-transparent font-semibold' 
            : 'text-foreground border-border hover:border-primary/50 hover:bg-muted'
          }
          ${disabled && !onEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        style={{ backgroundColor: selected ? bgColor : undefined }}
      >
        <span className="mr-2">{categoryData?.icon}</span>
        {isCustom && <span className="mr-1">✨</span>}
        {label}
      </button>
      {onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditValue(label);
            setEditing(true);
          }}
          className="absolute top-1 right-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-muted text-muted-foreground"
          title="Editar nome"
        >
          <Pencil className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
