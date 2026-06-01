import { useState } from 'react';
import { Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AnnouncementForm, type AnnouncementFormData } from './AnnouncementForm';
import { useAnnouncements } from '@/hooks/useAnnouncements';

interface CreateAnnouncementDialogProps {
  onSuccess?: () => void;
}

export function CreateAnnouncementDialog({ onSuccess }: CreateAnnouncementDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createAnnouncement } = useAnnouncements();

  const handleSubmit = async (data: AnnouncementFormData) => {
    setIsSubmitting(true);
    try {
      const result = await createAnnouncement({
        title: data.title,
        body: data.body,
        expires_at: data.expires_at,
      });

      if (result) {
        setOpen(false);
        onSuccess?.();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Megaphone className="mr-2 h-4 w-4" />
          Novo Comunicado
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Publicar Comunicado</DialogTitle>
          <DialogDescription>
            Crie um comunicado para todos os membros da organização. Eles serão notificados automaticamente.
          </DialogDescription>
        </DialogHeader>
        <AnnouncementForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      </DialogContent>
    </Dialog>
  );
}
