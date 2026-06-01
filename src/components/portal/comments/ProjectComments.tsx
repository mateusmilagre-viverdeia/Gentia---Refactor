import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Send } from "lucide-react";
import { useProjectComments, type ProjectCommentEntityType } from "@/hooks/useProjectComments";
import { formatBRTRelative } from "@/lib/datetime";

function CommentItem({
  comment,
  onDelete,
  canDelete,
}: {
  comment: { id: string; content: string; created_at: string; author?: { full_name: string } };
  onDelete: (id: string) => void;
  canDelete: boolean;
}) {
  const timeLabel = useMemo(() => {
    return formatBRTRelative(new Date(comment.created_at));
  }, [comment.created_at]);

  return (
    <div className="rounded-lg border border-border/50 bg-background/50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <p className="text-sm font-medium truncate">{comment.author?.full_name || "Usuário"}</p>
            <p className="text-xs text-muted-foreground shrink-0">{timeLabel}</p>
          </div>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap mt-1">{comment.content}</p>
        </div>
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onDelete(comment.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function ProjectComments({
  accountId,
  entityType,
  entityId,
  title = "Comentários",
}: {
  accountId: string;
  entityType: ProjectCommentEntityType;
  entityId: string;
  title?: string;
}) {
  const [content, setContent] = useState("");

  const { comments, isLoading, addComment, deleteComment } = useProjectComments({
    accountId,
    entityType,
    entityId,
  });

  const canSubmit = content.trim().length > 0 && !addComment.isPending;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva um comentário..."
            className="min-h-24"
          />
          <div className="flex justify-end">
            <Button
              onClick={() => {
                addComment.mutate(
                  { content },
                  {
                    onSuccess: () => setContent(""),
                  }
                );
              }}
              disabled={!canSubmit}
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>
        ) : (
          <div className="space-y-2">
            {comments.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                onDelete={(id) => deleteComment.mutate(id)}
                canDelete={!deleteComment.isPending}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
