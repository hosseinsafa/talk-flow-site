
import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  imageUrl?: string;
  isStreaming?: boolean;
  isLoading?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const saveMessage = async (sessionId: string, content: string, role: 'user' | 'assistant') => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          content,
          role
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const updateUsageCount = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase.functions.invoke('increment', {
        body: {
          table_name: 'user_usage',
          column_name: 'chat_messages_count',
          user_id: user.id
        }
      });

      if (error) {
        console.error('Error updating usage:', error);
      }
    } catch (error) {
      console.error('Error updating usage:', error);
    }
  };

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  const updateMessage = (id: string, updates: Partial<Message>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, ...updates } : msg
    ));
  };

  const removeMessage = (id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const abortStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStreamingMessageId(null);
  };

  return {
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
    removeMessage,
    clearMessages,
    abortStreaming,
    toast
  };
};
