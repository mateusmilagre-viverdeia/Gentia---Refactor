import { useNavigate } from 'react-router-dom';
import { Megaphone, Inbox } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { AnnouncementCard } from '@/components/announcements/AnnouncementCard';
import { CreateAnnouncementDialog } from '@/components/announcements/CreateAnnouncementDialog';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useState } from 'react';

export default function Comunicados() {
  const navigate = useNavigate();
  const { announcements, loading, canManage, deleteAnnouncement, isExpired, refetch } = useAnnouncements();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (deleteId) {
      await deleteAnnouncement(deleteId);
      setDeleteId(null);
    }
  };

  const activeAnnouncements = announcements.filter(a => !isExpired(a));
  const expiredAnnouncements = announcements.filter(a => isExpired(a));

  return (
    <AppLayout 
      title="Comunicados"
      breadcrumb={[
        { label: 'Conta', href: '/conta/perfil' },
        { label: 'Comunicados' },
      ]}
    >
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Comunicados</h1>
              <p className="text-sm text-muted-foreground">
                {activeAnnouncements.length} comunicado{activeAnnouncements.length !== 1 ? 's' : ''} ativo{activeAnnouncements.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          {canManage && <CreateAnnouncementDialog onSuccess={refetch} />}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && announcements.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-1">Nenhum comunicado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {canManage 
                ? 'Publique o primeiro comunicado para sua equipe.'
                : 'Não há comunicados publicados no momento.'
              }
            </p>
            {canManage && <CreateAnnouncementDialog onSuccess={refetch} />}
          </div>
        )}

        {/* Active Announcements */}
        {!loading && activeAnnouncements.length > 0 && (
          <div className="space-y-4 mb-8">
            {activeAnnouncements.map(announcement => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                isExpired={false}
                canDelete={canManage}
                onDelete={() => setDeleteId(announcement.id)}
                onClick={() => navigate(`/conta/comunicados/${announcement.id}`)}
              />
            ))}
          </div>
        )}

        {/* Expired Announcements */}
        {!loading && expiredAnnouncements.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">
              Comunicados Expirados
            </h2>
            <div className="space-y-4">
              {expiredAnnouncements.map(announcement => (
                <AnnouncementCard
                  key={announcement.id}
                  announcement={announcement}
                  isExpired={true}
                  canDelete={canManage}
                  onDelete={() => setDeleteId(announcement.id)}
                  onClick={() => navigate(`/conta/comunicados/${announcement.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
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
