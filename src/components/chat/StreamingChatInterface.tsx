
import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatSidebar from './ChatSidebar';
import TypingIndicator from './TypingIndicator';
import ChatHeader from './ChatHeader';
import ChatInput from './ChatInput';
import EmptyState from './EmptyState';
import { useChat, Message } from '@/hooks/useChat';
import { useChatSessions } from '@/hooks/useChatSessions';
import { useImageGeneration } from '@/hooks/useImageGeneration';
import { useStreamingChat } from '@/hooks/useStreamingChat';

const StreamingChatInterface = () => {
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    streamingMessageId,
    setStreamingMessageId,
    abortControllerRef,
    saveMessage,
    updateUsageCount,
    addMessage,
    clearMessages,
    abortStreaming,
    toast
  } = useChat();

  const {
    chatSessions,
    currentSessionId,
    setCurrentSessionId,
    isNewChat,
    setIsNewChat,
    loadChatSessions,
    createNewSession,
    updateSessionTimestamp,
    loadChatMessages
  } = useChatSessions();

  const {
    detectLanguage,
    isImageGenerationRequest,
    isConfirmationMessage,
    savePendingImageRequest,
    getPendingImageRequest,
    markPendingRequestCompleted,
    generateImage
  } = useImageGeneration();

  const { streamChatResponse } = useStreamingChat();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startNewChat = () => {
    abortStreaming();
    clearMessages();
    setCurrentSessionId(null);
    setIsNewChat(true);
    setSidebarOpen(false);
    textareaRef.current?.focus();
  };

  const selectSession = async (sessionId: string) => {
    abortStreaming();
    setCurrentSessionId(sessionId);
    setIsNewChat(false);
    const loadedMessages = await loadChatMessages(sessionId);
    setMessages(loadedMessages);
    setSidebarOpen(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    console.log('📤 Sending message:', input.trim());

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      content: input.trim(),
      role: 'user',
      timestamp: new Date()
    };

    addMessage(userMessage);
    const currentInput = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      let sessionId = currentSessionId;

      if (isNewChat || !sessionId) {
        sessionId = await createNewSession(currentInput);
        if (!sessionId) {
          throw new Error('Failed to create chat session');
        }
        setCurrentSessionId(sessionId);
        setIsNewChat(false);
        await loadChatSessions();
      }

      await saveMessage(sessionId, currentInput, 'user');

      const userLanguage = detectLanguage(currentInput);
      const imageRequest = isImageGenerationRequest(currentInput);

      console.log('🔍 Language detected:', userLanguage);
      console.log('🔍 Image request analysis:', imageRequest);

      if (isConfirmationMessage(currentInput)) {
        console.log('🎯 Confirmation message detected');
        const pendingRequest = await getPendingImageRequest();
        
        if (pendingRequest) {
          console.log('🎨 Processing confirmed image generation request');
          
          const loadingMessage: Message = {
            id: `loading_${Date.now()}`,
            content: userLanguage === 'persian' ? 'در حال ساخت تصویر...' : 'Generating image...',
            role: 'assistant',
            timestamp: new Date()
          };
          addMessage(loadingMessage);

          try {
            const imageUrl = await generateImage(pendingRequest.prompt);
            
            const imageMessage: Message = {
              id: `img_${Date.now()}`,
              content: userLanguage === 'persian' 
                ? `تصویر بر اساس "${pendingRequest.prompt}" ساخته شد`
                : `Generated image based on: "${pendingRequest.prompt}"`,
              role: 'assistant',
              timestamp: new Date(),
              imageUrl: imageUrl
            };

            setMessages(prev => prev.map(msg => 
              msg.id === loadingMessage.id ? imageMessage : msg
            ));

            await saveMessage(sessionId, imageMessage.content, 'assistant');
            await updateUsageCount();
            await markPendingRequestCompleted(pendingRequest.id);

          } catch (imageError) {
            console.error('❌ Image generation error:', imageError);
            
            const errorMessage: Message = {
              id: `error_${Date.now()}`,
              content: userLanguage === 'persian'
                ? `متاسفم، نتونستم تصویر رو بسازم. خطا: ${imageError.message}`
                : `Sorry, I couldn't generate the image. Error: ${imageError.message}`,
              role: 'assistant',
              timestamp: new Date()
            };

            setMessages(prev => prev.map(msg => 
              msg.id === loadingMessage.id ? errorMessage : msg
            ));

            await saveMessage(sessionId, errorMessage.content, 'assistant');
          }
        } else {
          console.log('💬 No pending image request, processing as normal chat');
          await streamChatResponse([...messages, userMessage], sessionId, selectedModel, setMessages, setStreamingMessageId, abortControllerRef, saveMessage, updateUsageCount);
        }
      }
      else if (imageRequest.isRequest) {
        console.log('🎨 Image generation request detected');
        
        let confirmationMessage: string;
        
        if (userLanguage === 'persian') {
          if (imageRequest.hasSpecificObject && imageRequest.object) {
            confirmationMessage = `بله، می‌تونم تصویر '${imageRequest.object}' رو بسازم. آیا تأیید می‌کنید که تصویر ساخته شود؟`;
          } else {
            confirmationMessage = 'بله، می‌تونم تصویر بسازم. چه تصویری نیاز دارید؟ لطفاً مشخص کنید تا تأیید کنم.';
          }
        } else {
          if (imageRequest.hasSpecificObject && imageRequest.object) {
            confirmationMessage = `Yes, I can generate an image of '${imageRequest.object}'. Do you confirm to proceed with generating the image?`;
          } else {
            confirmationMessage = 'Yes, I can generate an image. What image would you like me to generate? Please specify so I can confirm.';
          }
        }

        if (imageRequest.hasSpecificObject && imageRequest.object) {
          await savePendingImageRequest(sessionId, imageRequest.object);
        } else {
          await savePendingImageRequest(sessionId, currentInput);
        }
        
        const confirmationResponse: Message = {
          id: `confirm_${Date.now()}`,
          content: confirmationMessage,
          role: 'assistant',
          timestamp: new Date()
        };

        addMessage(confirmationResponse);
        await saveMessage(sessionId, confirmationResponse.content, 'assistant');
      } else {
        console.log('💬 Starting text response streaming');
        await streamChatResponse([...messages, userMessage], sessionId, selectedModel, setMessages, setStreamingMessageId, abortControllerRef, saveMessage, updateUsageCount);
      }

      await updateSessionTimestamp(sessionId);
      await loadChatSessions();

    } catch (error) {
      console.error('❌ Error in sendMessage:', error);
      toast({
        title: "خطا",
        description: "ارسال پیام با مشکل مواجه شد. لطفاً دوباره تلاش کنید.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  return (
    <div className="flex h-screen bg-[#212121] text-white">
      <ChatSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sessions={chatSessions}
        currentSessionId={currentSessionId}
        onNewChat={startNewChat}
        onSelectSession={selectSession}
      />

      <div className="flex flex-col flex-1 relative">
        <ChatHeader
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {streamingMessageId && <TypingIndicator />}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        <ChatInput
          input={input}
          setInput={setInput}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default StreamingChatInterface;
