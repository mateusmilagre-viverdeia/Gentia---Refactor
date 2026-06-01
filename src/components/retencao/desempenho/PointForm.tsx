import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import {
  getQuadrantFromPosition,
  QUADRANT_CONFIG,
} from '@/types/performance-assessment.types';
import type { PerformanceAssessmentPoint } from '@/types/performance-assessment.types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAccountMembers } from '@/hooks/useAccountMembers';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PointFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  point?: PerformanceAssessmentPoint | null;
  position?: { x: number; y: number };
  onSave: (firstName: string, lastName: string, notes: string) => void;
  onDelete?: () => void;
  mode: 'add' | 'edit';
}

export function PointForm({
  open,
  onOpenChange,
  point,
  position,
  onSave,
  onDelete,
  mode,
}: PointFormProps) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [notes, setNotes] = useState('');
  
  const { members, loading: membersLoading } = useAccountMembers();

  useEffect(() => {
    if (point) {
      setFirstName(point.first_name);
      setLastName(point.last_name);
      setNotes(point.notes || '');
      // Try to find matching user for edit mode
      const matchingMember = members.find(
        (m) => m.name?.toLowerCase() === `${point.first_name} ${point.last_name}`.toLowerCase()
      );
      if (matchingMember) {
        setSelectedUserId(matchingMember.user_id);
      }
    } else {
      setFirstName('');
      setLastName('');
      setNotes('');
      setSelectedUserId('');
    }
  }, [point, open, members]);

  const x = point?.x_position ?? position?.x ?? 50;
  const y = point?.y_position ?? position?.y ?? 50;
  const quadrant = getQuadrantFromPosition(x, y);
  const config = QUADRANT_CONFIG[quadrant];

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    const member = members.find((m) => m.user_id === userId);
    if (member) {
      const nameParts = member.name.split(' ');
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;
    onSave(firstName.trim(), lastName.trim(), notes.trim());
    onOpenChange(false);
  };

  const isValid = firstName.trim() && lastName.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? 'Adicionar Pessoa' : 'Editar Avaliação'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User Selection - only for add mode */}
          {mode === 'add' && (
            <div className="space-y-2">
              <Label>Selecionar pessoa *</Label>
              <Select value={selectedUserId} onValueChange={handleUserSelect}>
                <SelectTrigger>
                  <SelectValue placeholder={membersLoading ? "Carregando..." : "Selecione um usuário"} />
                </SelectTrigger>
                <SelectContent>
                  {members.length === 0 && !membersLoading ? (
                    <SelectItem value="empty" disabled>
                      Nenhum usuário encontrado
                    </SelectItem>
                  ) : (
                    members.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        <div className="flex flex-col">
                          <span>{member.name}</span>
                          {member.email && (
                            <span className="text-xs text-muted-foreground">{member.email}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Show name as read-only in edit mode */}
          {mode === 'edit' && (
            <div className="space-y-2">
              <Label>Pessoa</Label>
              <div className="p-3 rounded-lg bg-muted/50 text-sm font-medium">
                {firstName} {lastName}
              </div>
            </div>
          )}

          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              <span className="font-medium">{config.label}</span>
            </div>
            <p className="text-muted-foreground text-xs">
              Posição: Fit Cultural {x.toFixed(0)}%, Resultado {y.toFixed(0)}%
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Anotações (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações sobre esta avaliação..."
              rows={3}
            />
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
            {mode === 'edit' && onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir {firstName} {lastName} da avaliação?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        onDelete();
                        onOpenChange(false);
                      }}
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!isValid}>
                {mode === 'add' ? 'Adicionar' : 'Salvar'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
