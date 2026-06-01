import { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getPageContext } from '@/lib/helpKnowledgeBase';
import { getPageInstructions } from '@/lib/helpPageInstructions';
import { useToast } from '@/hooks/use-toast';
import { useHelpChatClientData, RichClientContext } from '@/hooks/useHelpChatClientData';
import { parseActionsFromResponse, ChatAction } from '@/components/help/HelpChatAction';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: ChatAction[];
  imageUrl?: string; // For displaying attached screenshots
}

const STORAGE_KEY = 'ep-help-chat-history';
const MAX_HISTORY_MESSAGES = 20;

export function useHelpChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();
  const { toast } = useToast();
  
  // Rich client context for personalized responses
  const { clientContext } = useHelpChatClientData();

  // Load messages from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setMessages(parsed.map((msg: ChatMessage) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }, []);

  // Save messages to localStorage when they change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY_MESSAGES)));
      } catch (error) {
        console.error('Error saving chat history:', error);
      }
    }
  }, [messages]);

  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const openChat = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  const sendMessage = useCallback(async (content: string, imageBase64?: string) => {
    if ((!content.trim() && !imageBase64) || isLoading) return;

    // Create image URL for display if there's an image
    const imageUrl = imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : undefined;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim() || 'O que você vê nesta imagem?',
      timestamp: new Date(),
      imageUrl
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const currentPage = getPageContext(location.pathname, location.search);
      const pageInstructionsContent = getPageInstructions(location.pathname, location.search);
      
      // Get last N messages for context (excluding the new one)
      const conversationHistory = messages.slice(-6).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const { data, error } = await supabase.functions.invoke('help-assistant', {
        body: {
          message: content.trim() || 'O que você vê nesta imagem? Explique o que está acontecendo e como posso usar esta funcionalidade.',
          conversationHistory,
          currentPage,
          clientContext,
          pageInstructions: pageInstructionsContent,
          image: imageBase64, // Send image if present
        }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Parse actions from response
      const { cleanContent, actions } = parseActionsFromResponse(data.message);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: cleanContent,
        timestamp: new Date(),
        actions: actions.length > 0 ? actions : undefined
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar mensagem';
      
      toast({
        title: "Erro no assistente",
        description: errorMessage,
        variant: "destructive"
      });

      // Add error message to chat
      const errorChatMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua pergunta. Por favor, tente novamente.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorChatMessage]);

    } finally {
      setIsLoading(false);
    }
  }, [messages, location.pathname, location.search, isLoading, toast, clientContext]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    isOpen,
    messages,
    isLoading,
    toggleChat,
    openChat,
    closeChat,
    sendMessage,
    clearHistory,
    currentPage: getPageContext(location.pathname, location.search)
  };
}
