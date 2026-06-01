import { useState } from 'react';

import { MessageCircle, Send, Reply, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePostComments, type PostComment } from '@/hooks/usePostComments';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { formatBRT } from "@/lib/datetime";

interface PostCommentsProps {
  postId: string;
}

function CommentItem({ 
  comment, 
  onReply, 
  onDelete, 
  currentUserId,
  depth = 0 
}: { 
  comment: PostComment; 
  onReply: (parentId: string) => void;
  onDelete: (id: string) => void;
  currentUserId?: string;
  depth?: number;
}) {
  const [showReplies, setShowReplies] = useState(true);
  const hasReplies = comment.replies && comment.replies.length > 0;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn("space-y-2", depth > 0 && "ml-8 pl-4 border-l border-border/50")}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.author?.avatar_url || undefined} />
          <AvatarFallback className="text-xs">
            {getInitials(comment.author?.full_name || 'U')}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{comment.author?.full_name}</span>
            <span className="text-xs text-muted-foreground">
              {formatBRT(new Date(comment.created_at), "dd/MM 'às' HH:mm")}
            </span>
          </div>
          <p className="text-sm text-foreground mt-1">{comment.content}</p>
          <div className="flex items-center gap-2 mt-1">
            {depth < 2 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs text-muted-foreground"
                onClick={() => onReply(comment.id)}
              >
                <Reply className="h-3 w-3 mr-1" />
                Responder
              </Button>
            )}
            {currentUserId === comment.user_id && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs text-destructive hover:text-destructive"
                onClick={() => onDelete(comment.id)}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Excluir
              </Button>
            )}
          </div>
        </div>
      </div>

      {hasReplies && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-muted-foreground ml-11"
            onClick={() => setShowReplies(!showReplies)}
          >
            {showReplies ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
            {comment.replies!.length} {comment.replies!.length === 1 ? 'resposta' : 'respostas'}
          </Button>
          {showReplies && (
            <div className="space-y-3">
              {comment.replies!.map(reply => (
                <CommentItem 
                  key={reply.id} 
                  comment={reply} 
                  onReply={onReply}
                  onDelete={onDelete}
                  currentUserId={currentUserId}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function PostComments({ postId }: PostCommentsProps) {
  const { user } = useAuth();
  const { comments, isLoading, addComment, deleteComment } = usePostComments(postId);
  const [isExpanded, setIsExpanded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    
    await addComment.mutateAsync({ 
      content: newComment, 
      parentId: replyingTo || undefined 
    });
    
    setNewComment('');
    setReplyingTo(null);
  };

  const handleReply = (parentId: string) => {
    setReplyingTo(parentId);
    setIsExpanded(true);
  };

  const handleDelete = (commentId: string) => {
    deleteComment.mutate(commentId);
  };

  const totalComments = comments.reduce((acc, c) => 
    acc + 1 + (c.replies?.length || 0), 0
  );

  return (
    <div className="space-y-3">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 text-sm text-muted-foreground gap-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <MessageCircle className="h-4 w-4" />
        {totalComments > 0 ? `${totalComments} comentários` : 'Comentar'}
        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </Button>

      {isExpanded && (
        <div className="space-y-4 pt-2 border-t border-border/50">
          {/* Comment input */}
          <div className="flex gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">EU</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              {replyingTo && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Reply className="h-3 w-3" />
                  Respondendo a um comentário
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-5 text-xs"
                    onClick={() => setReplyingTo(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Escreva um comentário..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[60px] text-sm resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleSubmit();
                    }
                  }}
                />
                <Button 
                  size="icon" 
                  onClick={handleSubmit}
                  disabled={!newComment.trim() || addComment.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Comments list */}
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Carregando comentários...
            </p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum comentário ainda. Seja o primeiro!
            </p>
          ) : (
            <div className="space-y-4">
              {comments.map(comment => (
                <CommentItem 
                  key={comment.id} 
                  comment={comment}
                  onReply={handleReply}
                  onDelete={handleDelete}
                  currentUserId={user?.id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
