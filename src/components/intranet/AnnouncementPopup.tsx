import { useState, useEffect } from 'react';

import { Megaphone, Cake, UserPlus, Trophy, Calendar, MessageSquare, CheckCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useReadConfirmations, type UnconfirmedPost } from '@/hooks/useReadConfirmations';
import { formatBRT } from "@/lib/datetime";

const postTypeConfig: Record<string, { icon: typeof Megaphone; label: string; colorClass: string }> = {
  announcement: { icon: Megaphone, label: 'Comunicado', colorClass: 'text-blue-600' },
  birthday: { icon: Cake, label: 'Aniversário', colorClass: 'text-pink-600' },
  new_hire: { icon: UserPlus, label: 'Novo Colaborador', colorClass: 'text-green-600' },
  promotion: { icon: Trophy, label: 'Promoção', colorClass: 'text-amber-600' },
  holiday: { icon: Calendar, label: 'Feriado', colorClass: 'text-purple-600' },
  custom: { icon: MessageSquare, label: 'Geral', colorClass: 'text-muted-foreground' },
};

export function AnnouncementPopup() {
  const { unconfirmedPosts, confirmReading, hasUnconfirmedPosts } = useReadConfirmations();
  const [open, setOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasShown, setHasShown] = useState(false);

  // Show popup when there are unconfirmed posts (only once per session)
  useEffect(() => {
    if (hasUnconfirmedPosts && !hasShown) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        setOpen(true);
        setHasShown(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasUnconfirmedPosts, hasShown]);

  const currentPost = unconfirmedPosts[currentIndex];
  const config = currentPost ? (postTypeConfig[currentPost.post_type] || postTypeConfig.custom) : postTypeConfig.custom;
  const Icon = config.icon;

  const handleConfirm = async () => {
    if (!currentPost) return;
    
    await confirmReading.mutateAsync(currentPost.id);
    
    if (currentIndex < unconfirmedPosts.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setOpen(false);
      setCurrentIndex(0);
    }
  };

  const handleSkip = () => {
    if (currentIndex < unconfirmedPosts.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setOpen(false);
      setCurrentIndex(0);
    }
  };

  if (!currentPost) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-2 rounded-full bg-muted ${config.colorClass}`}>
              <Icon className="h-5 w-5" />
            </div>
            <Badge variant="secondary">{config.label}</Badge>
            {unconfirmedPosts.length > 1 && (
              <Badge variant="outline" className="ml-auto">
                {currentIndex + 1} de {unconfirmedPosts.length}
              </Badge>
            )}
          </div>
          <DialogTitle className="text-xl">{currentPost.title}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Publicado em {formatBRT(new Date(currentPost.published_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm")}
          </DialogDescription>
        </DialogHeader>
        
        {currentPost.content && (
          <ScrollArea className="max-h-[300px] mt-2">
            <div className="text-sm text-foreground whitespace-pre-wrap pr-4">
              {currentPost.content}
            </div>
          </ScrollArea>
        )}
        
        <DialogFooter className="mt-4 flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={handleSkip}
            className="w-full sm:w-auto"
          >
            Ler depois
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={confirmReading.isPending}
            className="w-full sm:w-auto gap-2"
          >
            {confirmReading.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Confirmar Leitura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
