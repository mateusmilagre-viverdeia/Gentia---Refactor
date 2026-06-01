import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, TicketPlus } from 'lucide-react';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import type { TicketCategory, TicketPriority } from '@/types/support.types';
import { categoryLabels, priorityLabels } from '@/types/support.types';

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTitle?: string;
  initialDescription?: string;
  conversationContext?: Record<string, unknown>;
  pageContext?: string;
  onSuccess?: () => void;
}

export function CreateTicketDialog({
  open,
  onOpenChange,
  initialTitle = '',
  initialDescription = '',
  conversationContext,
  pageContext,
  onSuccess,
}: CreateTicketDialogProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [category, setCategory] = useState<TicketCategory>('general');
  const [priority, setPriority] = useState<TicketPriority>('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createTicket } = useSupportTickets();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;

    setIsSubmitting(true);

    const ticket = await createTicket({
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      priority,
      conversationContext,
      pageContext,
    });

    setIsSubmitting(false);

    if (ticket) {
      setTitle('');
      setDescription('');
      setCategory('general');
      setPriority('normal');
      onOpenChange(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TicketPlus className="h-5 w-5" />
            Abrir Chamado de Suporte
          </DialogTitle>
          <DialogDescription>
            Descreva seu problema ou dúvida. Nossa equipe responderá em breve.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Resumo do seu problema"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explique com mais detalhes..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {pageContext && (
            <p className="text-xs text-muted-foreground">
              Contexto: {pageContext}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!title.trim() || isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Chamado
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
