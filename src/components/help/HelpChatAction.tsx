import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ExternalLink, ArrowRight, TicketPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateTicketDialog } from '@/components/support/CreateTicketDialog';

export interface ChatAction {
  type: 'navigate' | 'external' | 'ticket';
  label: string;
  path: string;
}

interface HelpChatActionProps {
  action: ChatAction;
  onClick?: () => void;
  conversationContext?: Record<string, unknown>;
  pageContext?: string;
}

export function HelpChatAction({ action, onClick, conversationContext, pageContext }: HelpChatActionProps) {
  const navigate = useNavigate();
  const [showTicketDialog, setShowTicketDialog] = useState(false);

  const handleClick = () => {
    if (action.type === 'navigate') {
      navigate(action.path);
    } else if (action.type === 'external') {
      window.open(action.path, '_blank');
    } else if (action.type === 'ticket') {
      setShowTicketDialog(true);
      return; // Don't call onClick yet
    }
    onClick?.();
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        className={cn(
          "h-auto py-1.5 px-3 text-xs font-medium",
          action.type === 'ticket' 
            ? "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-600 hover:text-amber-700"
            : "bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary hover:text-primary"
        )}
      >
        {action.label}
        {action.type === 'external' ? (
          <ExternalLink className="ml-1.5 h-3 w-3" />
        ) : action.type === 'ticket' ? (
          <TicketPlus className="ml-1.5 h-3 w-3" />
        ) : (
          <ArrowRight className="ml-1.5 h-3 w-3" />
        )}
      </Button>

      <CreateTicketDialog
        open={showTicketDialog}
        onOpenChange={setShowTicketDialog}
        initialTitle={action.path || ''}
        conversationContext={conversationContext}
        pageContext={pageContext}
        onSuccess={() => onClick?.()}
      />
    </>
  );
}

// Parse actions from AI response
export function parseActionsFromResponse(content: string): { cleanContent: string; actions: ChatAction[] } {
  const actionRegex = /\[ACTION:(navigate|external|ticket):([^\]:]+):([^\]]*)\]/g;
  const actions: ChatAction[] = [];
  
  let cleanContent = content;
  let match;
  
  while ((match = actionRegex.exec(content)) !== null) {
    const [fullMatch, type, label, path] = match;
    actions.push({
      type: type as 'navigate' | 'external' | 'ticket',
      label,
      path: path || '',
    });
    cleanContent = cleanContent.replace(fullMatch, '');
  }
  
  // Clean up any double spaces or trailing whitespace
  cleanContent = cleanContent.replace(/\s+\n/g, '\n').replace(/\n\s+\n/g, '\n\n').trim();
  
  return { cleanContent, actions };
}
