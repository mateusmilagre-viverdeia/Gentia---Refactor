import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Trash2, Bot, User, Loader2, ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from '@/hooks/useHelpChat';
import { HelpQuickQuestions } from './HelpQuickQuestions';
import { HelpChatAction } from './HelpChatAction';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { useToast } from '@/hooks/use-toast';

interface HelpChatPanelProps {
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string, imageBase64?: string) => void;
  onClearHistory: () => void;
  currentPage: string;
}

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function HelpChatPanel({
  isOpen,
  messages,
  isLoading,
  onSendMessage,
  onClearHistory,
  currentPage
}: HelpChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedImagePreview, setAttachedImagePreview] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleImageUpload = useCallback((file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: "Formato inválido",
        description: "Use imagens PNG, JPG ou WebP.",
        variant: "destructive"
      });
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast({
        title: "Imagem muito grande",
        description: "O tamanho máximo é 2MB.",
        variant: "destructive"
      });
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setAttachedImagePreview(previewUrl);

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      setAttachedImage(base64);
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    if (attachedImagePreview) {
      URL.revokeObjectURL(attachedImagePreview);
    }
    setAttachedImage(null);
    setAttachedImagePreview(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((inputValue.trim() || attachedImage) && !isLoading) {
      const messageText = inputValue.trim() || (attachedImage ? "O que você vê nesta imagem?" : "");
      onSendMessage(messageText, attachedImage || undefined);
      setInputValue('');
      handleRemoveImage();
    }
  };

  const handleQuickQuestion = (question: string) => {
    onSendMessage(question);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] print:hidden"
        >
          <div className="bg-background border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[500px] max-h-[calc(100vh-8rem)]">
            {/* Header */}
            <div className="bg-primary/5 border-b border-border px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Assistente EP Partners</h3>
                  <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                    {currentPage}
                  </p>
                </div>
              </div>
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClearHistory}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  title="Limpar histórico"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Messages Area */}
            <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
              {messages.length === 0 ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 text-sm">
                      <p>
                        Olá! 👋 Sou o assistente da plataforma EP Partners. 
                        Como posso te ajudar hoje?
                      </p>
                    </div>
                  </div>
                  
                  <div className="pl-11">
                    <p className="text-xs text-muted-foreground mb-2">
                      Perguntas frequentes:
                    </p>
                    <HelpQuickQuestions 
                      onSelect={handleQuickQuestion} 
                      disabled={isLoading}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex items-start gap-3",
                        message.role === 'user' && "flex-row-reverse"
                      )}
                    >
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                        message.role === 'user' 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-primary/10"
                      )}>
                        {message.role === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className={cn(
                        "rounded-2xl px-4 py-3 text-sm max-w-[280px]",
                        message.role === 'user'
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-muted rounded-tl-sm"
                      )}>
                        {message.role === 'assistant' ? (
                          <div className="space-y-3">
                            <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                              <ReactMarkdown>{message.content}</ReactMarkdown>
                            </div>
                            
                            {/* Render actions if present */}
                            {message.actions && message.actions.length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                                {message.actions.map((action, index) => (
                                  <HelpChatAction 
                                    key={index} 
                                    action={action} 
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {/* Show attached image if present */}
                            {message.imageUrl && (
                              <img 
                                src={message.imageUrl} 
                                alt="Screenshot anexado" 
                                className="rounded-lg max-w-full border border-primary-foreground/20"
                              />
                            )}
                            <p>{message.content}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {/* Loading indicator */}
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-3"
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Digitando...</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t border-border p-3">
              {/* Image Preview */}
              {attachedImagePreview && (
                <div className="mb-2 relative inline-block">
                  <img 
                    src={attachedImagePreview} 
                    alt="Preview" 
                    className="h-16 rounded-lg border border-border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="flex gap-2">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                
                {/* Attach image button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleAttachClick}
                  disabled={isLoading}
                  title="Anexar screenshot"
                  className="shrink-0"
                >
                  <ImagePlus className="h-4 w-4" />
                </Button>
                
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={attachedImage ? "Descreva o que precisa..." : "Digite sua pergunta..."}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={(!inputValue.trim() && !attachedImage) || isLoading}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
