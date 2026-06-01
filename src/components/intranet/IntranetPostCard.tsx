
import { 
  Cake, 
  Megaphone, 
  UserPlus, 
  Trophy, 
  Calendar, 
  MessageSquare,
  Pin,
  MoreVertical,
  Trash2,
  Edit,
  Bell
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PostReactions } from './PostReactions';
import { PostComments } from './PostComments';
import type { IntranetPost, PostType } from '@/hooks/useIntranetFeed';
import { formatBRT } from "@/lib/datetime";

interface IntranetPostCardProps {
  post: IntranetPost;
  isAdmin?: boolean;
  onEdit?: (post: IntranetPost) => void;
  onDelete?: (id: string) => void;
  onTogglePin?: (id: string, isPinned: boolean) => void;
}

const postTypeConfig: Record<PostType, { 
  icon: typeof Cake; 
  label: string; 
  colorClass: string;
  bgClass: string;
}> = {
  birthday: {
    icon: Cake,
    label: 'Aniversário',
    colorClass: 'text-pink-600',
    bgClass: 'bg-pink-50 border-pink-200',
  },
  announcement: {
    icon: Megaphone,
    label: 'Comunicado',
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-50 border-blue-200',
  },
  new_hire: {
    icon: UserPlus,
    label: 'Novo Colaborador',
    colorClass: 'text-green-600',
    bgClass: 'bg-green-50 border-green-200',
  },
  promotion: {
    icon: Trophy,
    label: 'Promoção',
    colorClass: 'text-amber-600',
    bgClass: 'bg-amber-50 border-amber-200',
  },
  holiday: {
    icon: Calendar,
    label: 'Feriado',
    colorClass: 'text-purple-600',
    bgClass: 'bg-purple-50 border-purple-200',
  },
  custom: {
    icon: MessageSquare,
    label: 'Geral',
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted/50 border-border',
  },
};

export function IntranetPostCard({ 
  post, 
  isAdmin = false, 
  onEdit, 
  onDelete,
  onTogglePin 
}: IntranetPostCardProps) {
  const config = postTypeConfig[post.post_type] || postTypeConfig.custom;
  const Icon = config.icon;
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className={`relative transition-all hover:shadow-md ${config.bgClass}`}>
      {post.is_pinned && (
        <div className="absolute top-2 right-2">
          <Pin className="h-4 w-4 text-primary fill-primary" />
        </div>
      )}
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${config.colorClass} bg-background`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="text-xs">
                  {config.label}
                </Badge>
                {post.requires_confirmation && (
                  <Badge variant="outline" className="text-xs gap-1 text-amber-600 border-amber-300">
                    <Bell className="h-3 w-3" />
                    Leitura obrigatória
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold text-foreground">{post.title}</h3>
            </div>
          </div>
          
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onTogglePin?.(post.id, !post.is_pinned)}>
                  <Pin className="h-4 w-4 mr-2" />
                  {post.is_pinned ? 'Desafixar' : 'Fixar'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit?.(post)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete?.(post.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {post.content && (
          <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">
            {post.content}
          </p>
        )}
        
        {/* Related Employee */}
        {post.employee && (
          <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.employee.avatar_url || undefined} />
              <AvatarFallback className={config.colorClass}>
                {getInitials(post.employee.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{post.employee.full_name}</p>
              {post.employee.job_title && (
                <p className="text-xs text-muted-foreground">{post.employee.job_title}</p>
              )}
              {/* Show event date for birthdays */}
              {post.post_type === 'birthday' && post.event_date && (
                <p className="text-xs text-pink-600">
                  🎂 {formatBRT(new Date(post.event_date + 'T12:00:00'), "dd 'de' MMMM")}
                </p>
              )}
              {/* Show hire date and job for new hires */}
              {post.post_type === 'new_hire' && (
                <div className="text-xs text-green-600">
                  {post.new_job_title && <span>{post.new_job_title}</span>}
                  {post.department && <span> • {post.department}</span>}
                  {post.event_date && (
                    <span> • Desde {formatBRT(new Date(post.event_date + 'T12:00:00'), "dd/MM/yyyy")}</span>
                  )}
                </div>
              )}
              {/* Show promotion details */}
              {post.post_type === 'promotion' && (
                <p className="text-xs text-amber-600">
                  {post.previous_job_title && <span>{post.previous_job_title} → </span>}
                  {post.new_job_title && <span className="font-medium">{post.new_job_title}</span>}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Holiday date */}
        {post.post_type === 'holiday' && post.event_date && (
          <div className="flex items-center gap-2 p-3 bg-background rounded-lg">
            <Calendar className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium">
              {formatBRT(new Date(post.event_date + 'T12:00:00'), "EEEE, dd 'de' MMMM")}
            </span>
          </div>
        )}
        
        {/* Related Event */}
        {post.event && (
          <div className="flex items-center gap-2 p-3 bg-background rounded-lg">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{post.event.title}</span>
            <span className="text-xs text-muted-foreground">
              {formatBRT(new Date(post.event.event_date), "dd 'de' MMMM")}
            </span>
          </div>
        )}
        
        {/* Media */}
        {post.media_url && (
          <div className="mt-3">
            <img 
              src={post.media_url} 
              alt={post.title}
              className="rounded-lg max-h-64 w-full object-cover"
            />
          </div>
        )}
        
        {/* Footer with Reactions */}
        <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between">
          <PostReactions postId={post.id} />
          <p className="text-xs text-muted-foreground">
            {formatBRT(new Date(post.published_at), "dd 'de' MMMM 'às' HH:mm")}
          </p>
        </div>

        {/* Comments Section */}
        <div className="mt-2">
          <PostComments postId={post.id} />
        </div>
      </CardContent>
    </Card>
  );
}
