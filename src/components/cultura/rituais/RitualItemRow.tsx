import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { RitualItem } from "@/types/ritual.types";

interface RitualItemRowProps {
  item: RitualItem;
  onUpdate: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}

export function RitualItemRow({ item, onUpdate, onDelete }: RitualItemRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.item_text);

  const handleSave = () => {
    if (editText.trim()) {
      onUpdate(item.id, editText.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditText(item.item_text);
    setIsEditing(false);
  };

  const getSourceBadge = () => {
    switch (item.source) {
      case "ai":
        return (
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
            IA
          </span>
        );
      case "suggestion":
        return (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
            Sugestão
          </span>
        );
      default:
        return (
          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
            Custom
          </span>
        );
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
        <Input
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          className="flex-1"
          autoFocus
        />
        <Button size="sm" variant="ghost" onClick={handleSave}>
          <Check className="h-4 w-4 text-green-600" />
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancel}>
          <X className="h-4 w-4 text-red-600" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
      <div className="flex items-center gap-2 flex-1">
        <span className="text-sm">{item.item_text}</span>
        {getSourceBadge()}
      </div>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
          <Pencil className="h-4 w-4 text-gray-500" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onDelete(item.id)}>
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    </div>
  );
}
