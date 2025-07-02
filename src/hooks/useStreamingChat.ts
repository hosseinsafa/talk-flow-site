
import { useRef } from 'react';
import { Message } from './useChat';

export const useStreamingChat = () => {
  const streamChatResponse = async (
    messages: Message[], 
    sessionId: string,
    selectedModel: string,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    setStreamingMessageId: React.Dispatch<React.SetStateAction<string | null>>,
    abortControllerRef: React.MutableRefObject<AbortController | null>,
    saveMessage: (sessionId: string, content: string, role: 'user' | 'assistant') => Promise<void>,
    updateUsageCount: () => Promise<void>
  ) => {
    let streamingId: string | null = null;
    
    try {
      console.log('🚀 Starting streaming chat request with model:', selectedModel);
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      
      const response = await fetch(`https://dwejnmcdvldbaqzltidt.supabase.co/functions/v1/streaming-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3ZWpubWNkdmxkYmFxemx0aWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMzk2MTYsImV4cCI6MjA2NjcxNTYxNn0.qNtS4Xu_W2Ss3IqPRnYoyWJzmyxl9laajKFCNyOyvhQ`,
        },
        body: JSON.stringify({
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          model: selectedModel, // Use the selected model
          max_tokens: 2000,
          temperature: 0.7
        }),
        signal: abortControllerRef.current.signal
      });

      console.log('📡 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Streaming response error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('❌ No response body reader available');
      }

      const decoder = new TextDecoder();
      let accumulatedContent = '';
      streamingId = `streaming_${Date.now()}`;
      
      console.log('✅ Created streaming message with ID:', streamingId);
      setStreamingMessageId(streamingId);

      const initialMessage: Message = {
        id: streamingId,
        content: '',
        role: 'assistant',
        timestamp: new Date(),
        isStreaming: true
      };

      setMessages(prev => {
        console.log('➕ Adding initial streaming message');
        return [...prev, initialMessage];
      });

      try {
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('✅ Stream reading completed');
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '') continue;
            
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              
              if (data === '[DONE]') {
                console.log('🏁 Stream completed with [DONE]');
                break;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                
                if (content) {
                  console.log('💬 Adding content to stream:', content);
                  accumulatedContent += content;
                  
                  setMessages(prev => prev.map(msg => 
                    msg.id === streamingId 
                      ? { 
                          ...msg, 
                          content: accumulatedContent,
                          isStreaming: true 
                        }
                      : msg
                  ));
                }
              } catch (parseError) {
                console.log('⚠️ Parse error for chunk (expected for some chunks):', parseError);
              }
            }
          }
        }
      } catch (streamError) {
        console.error('❌ Stream reading error:', streamError);
        if (streamError.name !== 'AbortError') {
          throw streamError;
        }
      }

      console.log('✅ Final accumulated content length:', accumulatedContent.length);

      const finalContent = accumulatedContent.trim() || 'Sorry, I couldn\'t generate a response.';
      const finalMessageId = `msg_${Date.now()}`;
      const finalMessage: Message = {
        id: finalMessageId,
        content: finalContent,
        role: 'assistant',
        timestamp: new Date(),
        isStreaming: false
      };

      console.log('✅ Creating final message with ID:', finalMessageId);

      setMessages(prev => {
        const withoutStreaming = prev.filter(msg => msg.id !== streamingId);
        console.log('🔄 Replacing streaming message with final message');
        return [...withoutStreaming, finalMessage];
      });

      setStreamingMessageId(null);

      if (finalContent !== 'Sorry, I couldn\'t generate a response.') {
        console.log('💾 Saving message to database');
        await saveMessage(sessionId, finalContent, 'assistant');
        await updateUsageCount();
      }

      return finalContent;

    } catch (error) {
      console.error('❌ Streaming error:', error);
      setStreamingMessageId(null);
      
      if (error.name === 'AbortError') {
        console.log('⚠️ Request was aborted');
        return;
      }
      
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
        isStreaming: false
      };

      setMessages(prev => {
        const withoutStreaming = streamingId ? prev.filter(msg => msg.id !== streamingId) : prev;
        return [...withoutStreaming, errorMessage];
      });
      
      throw error;
    }
  };

  return { streamChatResponse };
};
