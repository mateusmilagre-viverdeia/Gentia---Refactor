
import { Megaphone, Trash2, Clock, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Announcement } from '@/hooks/useAnnouncements';
import { formatBRT, formatBRTRelative } from "@/lib/datetime";

interface AnnouncementCardProps {
  announcement: Announcement;
  isExpired: boolean;
  canDelete: boolean;
  onDelete?: () => void;
  onClick?: () => void;
}

export function AnnouncementCard({
  announcement,
  isExpired,
  canDelete,
  onDelete,
  onClick,
}: AnnouncementCardProps) {
  const timeAgo = formatBRTRelative(new Date(announcement.published_at));

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        isExpired ? 'opacity-60' : ''
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Megaphone className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base line-clamp-1">{announcement.title}</CardTitle>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{timeAgo}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isExpired && (
              <Badge variant="secondary" className="text-xs">
                Expirado
              </Badge>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {announcement.body}
        </p>
        {announcement.expires_at && !isExpired && (
          <p className="text-xs text-muted-foreground mt-2">
            Expira em {formatBRT(new Date(announcement.expires_at), "dd 'de' MMMM")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
