import { Heart, PartyPopper, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePostReactions, type ReactionType } from '@/hooks/usePostReactions';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface PostReactionsProps {
  postId: string;
}

const reactionConfig: Record<ReactionType, {
  icon: typeof Heart;
  label: string;
  activeClass: string;
}> = {
  like: {
    icon: Heart,
    label: 'Curtir',
    activeClass: 'text-red-500 fill-red-500',
  },
  celebrate: {
    icon: PartyPopper,
    label: 'Comemorar',
    activeClass: 'text-amber-500',
  },
  support: {
    icon: ThumbsUp,
    label: 'Apoiar',
    activeClass: 'text-blue-500 fill-blue-500',
  },
};

export function PostReactions({ postId }: PostReactionsProps) {
  const { counts, hasReacted, toggleReaction } = usePostReactions(postId);

  const handleReaction = (type: ReactionType) => {
    toggleReaction.mutate(type);
  };

  return (
    <div className="flex items-center gap-1">
      {(Object.keys(reactionConfig) as ReactionType[]).map((type) => {
        const config = reactionConfig[type];
        const Icon = config.icon;
        const isActive = hasReacted(type);
        const count = counts[type];

        return (
          <Button
            key={type}
            variant="ghost"
            size="sm"
            onClick={() => handleReaction(type)}
            disabled={toggleReaction.isPending}
            className={cn(
              'h-8 px-2 gap-1 transition-colors',
              isActive && config.activeClass
            )}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={isActive ? 'active' : 'inactive'}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
                transition={{ duration: 0.15 }}
              >
                <Icon className="h-4 w-4" />
              </motion.div>
            </AnimatePresence>
            {count > 0 && (
              <span className="text-xs font-medium">{count}</span>
            )}
          </Button>
        );
      })}
    </div>
  );
}
