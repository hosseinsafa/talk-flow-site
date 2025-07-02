
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
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini'); // Default to GPT-4o Mini
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
    updateMessage,
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

    console.log('📤 === SENDING MESSAGE ===', input.trim());

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
      
      // Check if this is an image generation request
      if (isImageGenerationRequest(currentInput)) {
        console.log('🎨 === IMAGE GENERATION REQUEST DETECTED ===');
        
        // Add loading message
        const loadingMessageId = `loading_${Date.now()}`;
        const loadingMessage: Message = {
          id: loadingMessageId,
          content: userLanguage === 'persian' 
            ? 'در حال ساخت تصویر برای شما...' 
            : 'Generating image for you...',
          role: 'assistant',
          timestamp: new Date(),
          isLoading: true
        };
        
        console.log('➕ Adding loading message:', loadingMessageId);
        addMessage(loadingMessage);

        try {
          console.log('🚀 Starting image generation for prompt:', currentInput);
          const imageUrl = await generateImage(currentInput);
          console.log('✅ Image generated successfully, URL:', imageUrl);
          
          if (!imageUrl) {
            throw new Error('No image URL returned from generation');
          }
          
          const imageMessage: Message = {
            id: `img_${Date.now()}`,
            content: userLanguage === 'persian' 
              ? `تصویر مورد نظر شما ساخته شد`
              : `Here's the image you requested`,
            role: 'assistant',
            timestamp: new Date(),
            imageUrl: imageUrl,
            isLoading: false
          };

          console.log('🖼️ Updating message with image:', {
            loadingId: loadingMessageId,
            imageUrl: imageUrl,
            messageId: imageMessage.id
          });
          
          updateMessage(loadingMessageId, imageMessage);

          await saveMessage(sessionId, imageMessage.content, 'assistant');
          await updateUsageCount();

          console.log('🎉 === IMAGE GENERATION COMPLETED ===');

        } catch (imageError) {
          console.error('❌ Image generation error:', imageError);
          
          const errorMessage: Message = {
            id: `error_${Date.now()}`,
            content: userLanguage === 'persian'
              ? 'متأسفم، مشکلی در ساخت تصویر پیش آمد. لطفاً دوباره تلاش کنید.'
              : `Sorry, I couldn't generate the image. Please try again.`,
            role: 'assistant',
            timestamp: new Date(),
            isLoading: false
          };

          updateMessage(loadingMessageId, errorMessage);
          await saveMessage(sessionId, errorMessage.content, 'assistant');
        }
      } else {
        console.log('💬 === STARTING TEXT RESPONSE STREAMING ===');
        await streamChatResponse([...messages, userMessage], sessionId, selectedModel, setMessages, setStreamingMessageId, abortControllerRef, saveMessage, updateUsageCount);
      }

      await updateSessionTimestamp(sessionId);
      await loadChatSessions();

    } catch (error) {
      console.error('❌ Error in sendMessage:', error);
      const userLanguage = detectLanguage(currentInput);
      const errorText = userLanguage === 'persian' 
        ? 'ارسال پیام با مشکل مواجه شد. لطفاً دوباره تلاش کنید.'
        : 'Failed to send message. Please try again.';
      
      toast({
        title: userLanguage === 'persian' ? "خطا" : "Error",
        description: errorText,
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
