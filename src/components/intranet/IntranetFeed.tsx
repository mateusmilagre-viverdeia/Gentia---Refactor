import { useState } from 'react';
import { Loader2, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIntranetFeed, type IntranetPost } from '@/hooks/useIntranetFeed';
import { useAccount } from '@/hooks/useAccount';
import { IntranetPostCard } from './IntranetPostCard';
import { CreatePostDialog } from './CreatePostDialog';
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

export function IntranetFeed() {
  const { posts, isLoading, deletePost, togglePin, refetch } = useIntranetFeed();
  const { canManage } = useAccount();
  const [createOpen, setCreateOpen] = useState(false);
  const [editPost, setEditPost] = useState<IntranetPost | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (deleteId) {
      await deletePost.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleTogglePin = async (id: string, isPinned: boolean) => {
    await togglePin.mutateAsync({ id, is_pinned: isPinned });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Feed</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {canManage && (
            <Button onClick={() => setCreateOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Novo Post
            </Button>
          )}
        </div>
      </div>

      {/* Posts List */}
      {posts.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <p className="text-muted-foreground">Nenhum post ainda.</p>
          {canManage && (
            <Button 
              variant="link" 
              onClick={() => setCreateOpen(true)}
              className="mt-2"
            >
              Criar primeiro post
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <IntranetPostCard
              key={post.id}
              post={post}
              isAdmin={canManage}
              onEdit={setEditPost}
              onDelete={setDeleteId}
              onTogglePin={handleTogglePin}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <CreatePostDialog
        open={createOpen || !!editPost}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditPost(null);
          }
        }}
        editPost={editPost}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir post?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O post será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
