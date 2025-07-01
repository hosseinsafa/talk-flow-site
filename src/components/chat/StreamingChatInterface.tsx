import React, { useState, useRef, useEffect } from 'react';
import { Send, Menu, ArrowUp, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ChatMessage from './ChatMessage';
import ChatSidebar from './ChatSidebar';
import TypingIndicator from './TypingIndicator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  imageUrl?: string;
  isStreaming?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

const StreamingChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isNewChat, setIsNewChat] = useState(true);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (user) {
      loadChatSessions();
    }
  }, [user]);

  const loadChatSessions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setChatSessions(data || []);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    }
  };

  const loadChatMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        content: msg.content,
        role: msg.role as 'user' | 'assistant',
        timestamp: new Date(msg.created_at)
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const createNewSession = async (firstMessage: string): Promise<string | null> => {
    if (!user) return null;

    try {
      const title = firstMessage.length > 50 
        ? firstMessage.substring(0, 50) + '...' 
        : firstMessage;

      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          title: title
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  };

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

  const updateSessionTimestamp = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating session:', error);
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

  const isImageGenerationRequest = (text: string): boolean => {
    const imageKeywords = [
      'generate', 'create', 'make', 'draw', 'design', 'paint', 'sketch',
      'image', 'picture', 'photo', 'illustration', 'artwork', 'visual',
      'بساز', 'تصویر', 'عکس', 'نقاشی', 'طراحی', 'ایجاد'
    ];
    
    const lowerText = text.toLowerCase();
    return imageKeywords.some(keyword => lowerText.includes(keyword)) &&
           (lowerText.includes('image') || lowerText.includes('picture') || 
            lowerText.includes('تصویر') || lowerText.includes('عکس') ||
            lowerText.includes('generate') || lowerText.includes('create') ||
            lowerText.includes('بساز'));
  };

  const generateImage = async (prompt: string) => {
    try {
      console.log('Starting DALL·E 3 image generation with prompt:', prompt);
      
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: {
          prompt: prompt,
          model: 'dall-e-3',
          size: '1024x1792',
          quality: 'hd',
          n: 1
        }
      });

      if (error) {
        console.error('Error calling generate-image:', error);
        throw new Error(error.message);
      }

      console.log('DALL·E 3 generation completed:', data);
      
      if (data.data && data.data[0] && data.data[0].url) {
        await saveImageGeneration(prompt, data.data[0].url);
        return data.data[0].url;
      } else {
        throw new Error('No image URL returned from DALL·E 3');
      }
    } catch (error) {
      console.error('Error in generateImage:', error);
      throw error;
    }
  };

  const saveImageGeneration = async (prompt: string, imageUrl: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('image_generations')
        .insert({
          user_id: user.id,
          prompt: prompt,
          image_url: imageUrl,
          model_type: 'dall-e-3',
          status: 'completed'
        });

      if (error) {
        console.error('Error saving image generation:', error);
      }
    } catch (error) {
      console.error('Error saving image generation:', error);
    }
  };

  const streamChatResponse = async (messages: Message[], sessionId: string) => {
    try {
      abortControllerRef.current = new AbortController();
      
      console.log('Starting streaming chat request...');
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/streaming-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          model: selectedModel,
          max_tokens: 2000,
          temperature: 0.7
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Streaming response error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      console.log('Response received, starting stream processing');

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let accumulatedContent = '';
      const streamingId = `streaming_${Date.now()}`;
      
      console.log('Created streaming message with ID:', streamingId);
      setStreamingMessageId(streamingId);

      // Add initial streaming message
      const initialMessage: Message = {
        id: streamingId,
        content: '',
        role: 'assistant',
        timestamp: new Date(),
        isStreaming: true
      };

      setMessages(prev => {
        console.log('Adding initial streaming message to state');
        return [...prev, initialMessage];
      });

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('Stream reading completed');
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          console.log('Received chunk:', chunk.substring(0, 100) + '...');
          
          // Split chunk by lines and process each line
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.trim() === '') continue;
            
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              console.log('Processing data line:', data);
              
              if (data === '[DONE]') {
                console.log('Stream completed with [DONE]');
                break;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                
                if (content) {
                  console.log('Adding content to stream:', content);
                  accumulatedContent += content;
                  
                  // Update the streaming message with accumulated content
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
                console.log('Parse error for chunk (expected for some chunks):', parseError);
              }
            }
          }
        }
      } catch (streamError) {
        console.error('Stream reading error:', streamError);
        if (streamError.name !== 'AbortError') {
          throw streamError;
        }
      }

      console.log('Final accumulated content:', accumulatedContent);

      // Create the final message with a new stable ID
      const finalMessageId = `msg_${Date.now()}`;
      const finalMessage: Message = {
        id: finalMessageId,
        content: accumulatedContent.trim() || 'Sorry, I couldn\'t generate a response.',
        role: 'assistant',
        timestamp: new Date(),
        isStreaming: false
      };

      console.log('Creating final message with ID:', finalMessageId);

      // Replace the streaming message with the final message
      setMessages(prev => {
        const withoutStreaming = prev.filter(msg => msg.id !== streamingId);
        console.log('Replacing streaming message with final message');
        return [...withoutStreaming, finalMessage];
      });

      // Clear streaming state
      setStreamingMessageId(null);

      // Save the complete message if there's content
      if (accumulatedContent.trim()) {
        console.log('Saving message to database:', accumulatedContent);
        await saveMessage(sessionId, accumulatedContent, 'assistant');
        await updateUsageCount();
      } else {
        console.warn('No content accumulated from stream');
      }

      return accumulatedContent;

    } catch (error) {
      console.error('Streaming error:', error);
      setStreamingMessageId(null);
      
      if (error.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }
      
      // Add error message to chat
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
        isStreaming: false
      };

      setMessages(prev => {
        const withoutStreaming = prev.filter(msg => msg.id !== streamingMessageId);
        return [...withoutStreaming, errorMessage];
      });
      
      throw error;
    }
  };

  const startNewChat = () => {
    // Stop any ongoing streaming
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setMessages([]);
    setCurrentSessionId(null);
    setIsNewChat(true);
    setStreamingMessageId(null);
    setSidebarOpen(false);
    textareaRef.current?.focus();
  };

  const selectSession = async (sessionId: string) => {
    // Stop any ongoing streaming
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setCurrentSessionId(sessionId);
    setIsNewChat(false);
    setStreamingMessageId(null);
    await loadChatMessages(sessionId);
    setSidebarOpen(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || !user || isLoading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      content: input.trim(),
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      let sessionId = currentSessionId;

      // Create new session if this is a new chat
      if (isNewChat || !sessionId) {
        sessionId = await createNewSession(currentInput);
        if (!sessionId) {
          throw new Error('Failed to create chat session');
        }
        setCurrentSessionId(sessionId);
        setIsNewChat(false);
        await loadChatSessions();
      }

      // Save user message
      await saveMessage(sessionId, currentInput, 'user');

      // Check if this is an image generation request
      if (isImageGenerationRequest(currentInput)) {
        console.log('Detected image generation request');
        
        const loadingMessage: Message = {
          id: `loading_${Date.now()}`,
          content: 'Generating image...',
          role: 'assistant',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, loadingMessage]);

        try {
          const imageUrl = await generateImage(currentInput);
          
          const imageMessage: Message = {
            id: `img_${Date.now()}`,
            content: `Generated image based on: "${currentInput}"`,
            role: 'assistant',
            timestamp: new Date(),
            imageUrl: imageUrl
          };

          setMessages(prev => prev.map(msg => 
            msg.id === loadingMessage.id ? imageMessage : msg
          ));

          await saveMessage(sessionId, imageMessage.content, 'assistant');
          await updateUsageCount();

        } catch (imageError) {
          console.error('Image generation error:', imageError);
          
          const errorMessage: Message = {
            id: `error_${Date.now()}`,
            content: `Sorry, I couldn't generate the image. Error: ${imageError.message}`,
            role: 'assistant',
            timestamp: new Date()
          };

          setMessages(prev => prev.map(msg => 
            msg.id === loadingMessage.id ? errorMessage : msg
          ));

          await saveMessage(sessionId, errorMessage.content, 'assistant');
        }
      } else {
        // Stream text response
        console.log('Starting text response streaming');
        await streamChatResponse([...messages, userMessage], sessionId);
      }

      await updateSessionTimestamp(sessionId);
      await loadChatSessions();

    } catch (error) {
      console.error('Error in sendMessage:', error);
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  const getUserName = () => {
    return user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';
  };

  return (
    <div className="flex h-screen bg-[#212121] text-white">
      {/* Sidebar */}
      <ChatSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sessions={chatSessions}
        currentSessionId={currentSessionId}
        onNewChat={startNewChat}
        onSelectSession={selectSession}
      />

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 relative">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#212121]">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-400 hover:text-white hover:bg-white/10 h-10 w-10"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold text-white">ChatGPT</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Model Selector */}
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-36 h-9 text-sm border-white/20 bg-[#2f2f2f] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#2f2f2f] border-white/20 text-white">
                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-white max-w-2xl px-6">
                <h2 className="text-4xl font-semibold mb-6">How can I help, {getUserName()}?</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div className="p-4 rounded-xl bg-[#2f2f2f] hover:bg-[#3f3f3f] transition-colors cursor-pointer">
                    <h3 className="font-medium mb-2">Create a presentation</h3>
                    <p className="text-sm text-gray-400">about the solar system</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#2f2f2f] hover:bg-[#3f3f3f] transition-colors cursor-pointer">
                    <h3 className="font-medium mb-2">Generate an image</h3>
                    <p className="text-sm text-gray-400">of a futuristic city</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#2f2f2f] hover:bg-[#3f3f2f] transition-colors cursor-pointer">
                    <h3 className="font-medium mb-2">Explain quantum physics</h3>
                    <p className="text-sm text-gray-400">in simple terms</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#2f2f2f] hover:bg-[#3f3f2f] transition-colors cursor-pointer">
                    <h3 className="font-medium mb-2">Plan a trip</h3>
                    <p className="text-sm text-gray-400">to Japan for 7 days</p>
                  </div>
                </div>
              </div>
            </div>
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

        {/* Input */}
        <div className="p-6 bg-[#212121]">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative bg-[#2f2f2f] border border-white/20 rounded-3xl shadow-lg hover:border-white/30 transition-colors">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message ChatGPT..."
                  disabled={isLoading}
                  className="resize-none border-0 bg-transparent px-6 py-4 pr-20 text-white placeholder-gray-400 focus:ring-0 focus:outline-none min-h-[56px] max-h-[200px] leading-6 text-base font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif]"
                  style={{ height: 'auto' }}
                />
                <div className="absolute right-3 bottom-3 flex items-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full text-gray-400 hover:text-white hover:bg-white/10"
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    size="icon"
                    className="h-8 w-8 rounded-full bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </form>
            <p className="text-xs text-gray-500 text-center mt-3 font-[system-ui,-apple-system,BlinkMacSystemFont,'Segue_UI',Roboto,sans-serif]">
              ChatGPT can make mistakes. Check important info.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamingChatInterface;
