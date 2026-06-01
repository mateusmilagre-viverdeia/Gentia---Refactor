import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface HelpChatButtonProps {
  isOpen: boolean;
  onClick: () => void;
  hasUnread?: boolean;
}

export function HelpChatButton({ isOpen, onClick, hasUnread = false }: HelpChatButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            type: "spring", 
            stiffness: 260, 
            damping: 20,
            delay: 1 
          }}
          className="fixed bottom-6 right-6 z-50 print:hidden"
        >
          <Button
            onClick={onClick}
            size="lg"
            className={cn(
              "h-14 w-14 rounded-full shadow-lg transition-all duration-300",
              "bg-primary hover:bg-primary/90 text-primary-foreground",
              "hover:shadow-xl hover:scale-105",
              isOpen && "rotate-180"
            )}
          >
            <AnimatePresence mode="wait">
              {isOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X className="h-6 w-6" />
                </motion.div>
              ) : (
                <motion.div
                  key="chat"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <MessageCircle className="h-6 w-6" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Unread indicator */}
            {hasUnread && !isOpen && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive"
              />
            )}
          </Button>

          {/* Pulse animation when closed */}
          {!isOpen && (
            <motion.div
              className="absolute inset-0 rounded-full bg-primary/30 -z-10"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "loop",
              }}
            />
          )}
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="left" className="mr-2">
        <p>{isOpen ? 'Fechar chat' : 'Precisa de ajuda?'}</p>
      </TooltipContent>
    </Tooltip>
  );
}
