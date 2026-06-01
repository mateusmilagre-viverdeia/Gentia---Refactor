import { useState } from 'react';
import { Loader2, Send, Gift } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useBirthdayMessages } from '@/hooks/useBirthdayMessages';

interface Employee {
  id: string;
  full_name: string;
  avatar_url: string | null;
  job_title: string | null;
  department: string | null;
  birth_date: string | null;
}

interface BirthdayMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
}

const defaultMessages = [
  "Feliz aniversário! 🎉 Que este novo ano seja repleto de realizações e alegrias!",
  "Parabéns pelo seu dia! 🎂 Desejo muito sucesso e felicidade!",
  "Feliz aniversário! 🎈 Que você tenha um dia maravilhoso e um ano incrível!",
  "Muitas felicidades neste dia especial! 🌟 Parabéns!",
];

export function BirthdayMessageDialog({ open, onOpenChange, employee }: BirthdayMessageDialogProps) {
  const [message, setMessage] = useState('');
  const { sendMessage } = useBirthdayMessages(employee?.id);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSend = async () => {
    if (!employee || !message.trim()) return;
    
    await sendMessage.mutateAsync({
      employeeId: employee.id,
      message: message.trim(),
    });

    setMessage('');
    onOpenChange(false);
  };

  const selectDefaultMessage = (msg: string) => {
    setMessage(msg);
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-pink-500" />
            Enviar Parabéns
          </DialogTitle>
          <DialogDescription>
            Envie uma mensagem especial de aniversário
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Employee info */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarImage src={employee.avatar_url || undefined} />
              <AvatarFallback className="text-pink-600 bg-pink-100">
                {getInitials(employee.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{employee.full_name}</p>
              {employee.job_title && (
                <p className="text-sm text-muted-foreground">{employee.job_title}</p>
              )}
            </div>
          </div>

          {/* Quick messages */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Mensagens rápidas:</p>
            <div className="flex flex-wrap gap-2">
              {defaultMessages.map((msg, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-1.5 whitespace-normal text-left"
                  onClick={() => selectDefaultMessage(msg)}
                >
                  {msg.slice(0, 30)}...
                </Button>
              ))}
            </div>
          </div>

          {/* Message input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Sua mensagem</label>
            <Textarea
              placeholder="Escreva sua mensagem de parabéns..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSend}
              disabled={!message.trim() || sendMessage.isPending}
              className="bg-pink-600 hover:bg-pink-700"
            >
              {sendMessage.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar Parabéns
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
