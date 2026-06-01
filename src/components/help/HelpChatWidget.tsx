import { useHelpChat } from '@/hooks/useHelpChat';
import { HelpChatButton, HelpChatPanel } from '@/components/help';

export function HelpChatWidget() {
  const {
    isOpen,
    messages,
    isLoading,
    toggleChat,
    sendMessage,
    clearHistory,
    currentPage
  } = useHelpChat();

  return (
    <>
      <HelpChatButton isOpen={isOpen} onClick={toggleChat} />
      <HelpChatPanel
        isOpen={isOpen}
        messages={messages}
        isLoading={isLoading}
        onSendMessage={sendMessage}
        onClearHistory={clearHistory}
        currentPage={currentPage}
      />
    </>
  );
}
