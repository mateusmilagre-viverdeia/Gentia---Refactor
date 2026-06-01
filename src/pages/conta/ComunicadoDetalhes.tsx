import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { ArrowLeft, Megaphone, Clock, Calendar, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAnnouncements, type Announcement } from '@/hooks/useAnnouncements';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatBRT } from "@/lib/datetime";

export default function ComunicadoDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getAnnouncementById, deleteAnnouncement, isExpired, canManage } = useAnnouncements();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      if (!id) return;
      setLoading(true);
      const data = await getAnnouncementById(id);
      setAnnouncement(data);
      setLoading(false);
    };

    fetchAnnouncement();
  }, [id, getAnnouncementById]);

  const handleDelete = async () => {
    if (!announcement) return;
    const success = await deleteAnnouncement(announcement.id);
    if (success) {
      navigate('/conta/comunicados');
    }
  };

  const expired = announcement ? isExpired(announcement) : false;

  return (
    <AppLayout
      title="Comunicado"
      breadcrumb={[
        { label: 'Conta', href: '/conta/perfil' },
        { label: 'Comunicados', href: '/conta/comunicados' },
        { label: announcement?.title || 'Detalhes' },
      ]}
    >
      <div className="p-6 max-w-3xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/conta/comunicados')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para comunicados
        </Button>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {/* Not Found */}
        {!loading && !announcement && (
          <div className="text-center py-16">
            <div className="p-4 rounded-full bg-muted mb-4 inline-block">
              <Megaphone className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-1">Comunicado não encontrado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              O comunicado que você está procurando não existe ou foi removido.
            </p>
            <Button onClick={() => navigate('/conta/comunicados')}>
              Ver todos os comunicados
            </Button>
          </div>
        )}

        {/* Announcement Content */}
        {!loading && announcement && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-primary/10 mt-1">
                  <Megaphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold">{announcement.title}</h1>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>
                        Publicado em {formatBRT(new Date(announcement.published_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm")}
                      </span>
                    </div>
                    {announcement.expires_at && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Expira em {formatBRT(new Date(announcement.expires_at), "dd 'de' MMMM 'de' yyyy")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {expired && (
                <Badge variant="secondary">Expirado</Badge>
              )}
            </div>

            {/* Body */}
            <div className="bg-muted/50 rounded-lg p-6">
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                {announcement.body}
              </p>
            </div>

            {/* Actions */}
            {canManage && (
              <div className="flex justify-end pt-4 border-t">
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir comunicado
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir comunicado?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O comunicado será removido permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
