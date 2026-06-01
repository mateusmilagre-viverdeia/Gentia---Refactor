import { useState } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { TrafficLightCell } from "./TrafficLightCell";
import { TotalCell } from "./TotalCell";
import type { PeopleAnalysisMember } from "@/types/people-analysis.types";

interface MemberRowProps {
  member: PeopleAnalysisMember;
  values: { label: string }[];
  getRating: (memberId: string, valueLabel: string) => number | null;
  setRating: (memberId: string, valueLabel: string, score: number) => void;
  getMemberTotal: (memberId: string) => number;
  onUpdate: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export function MemberRow({
  member,
  values,
  getRating,
  setRating,
  getMemberTotal,
  onUpdate,
  onDelete,
}: MemberRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(member.name);

  const handleSave = () => {
    if (editName.trim()) {
      onUpdate(member.id, editName.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditName(member.name);
    setIsEditing(false);
  };

  return (
    <TableRow>
      <TableCell className="font-medium min-w-[200px]">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-8"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
            />
            <Button variant="ghost" size="sm" onClick={handleSave} className="h-8 w-8 p-0">
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancel} className="h-8 w-8 p-0">
              <X className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <span>{member.name}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-7 w-7 p-0"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(member.id)}
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </TableCell>

      {values.map((value) => (
        <TableCell key={value.label} className="text-center">
          <TrafficLightCell
            score={getRating(member.id, value.label)}
            onChange={(score) => setRating(member.id, value.label, score)}
          />
        </TableCell>
      ))}

      <TableCell className="text-center bg-muted/30">
        <TotalCell 
          total={getMemberTotal(member.id)} 
          maxPossible={values.length} 
        />
      </TableCell>
    </TableRow>
  );
}
