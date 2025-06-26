
import React, { useState, useRef, useEffect } from 'react';
import { Send, Image, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import ChatMessage from './ChatMessage';
import ChatSidebar from './ChatSidebar';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  imageUrl?: string;
}

interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
  messages: Message[];
  isActive: boolean;
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hello! I'm your AI assistant. I can chat with you and generate images using DALL·E 3. How can I help you today?",
      role: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [imageMode, setImageMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('default');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Image generation keywords for automatic detection
  const imageKeywords = ['generate an image of', 'create an image', 'draw', 'illustrate', 'make a picture', 'generate image'];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const isImageRequest = (text: string) => {
    const lowerText = text.toLowerCase();
    return imageKeywords.some(keyword => lowerText.includes(keyword));
  };

  const generateImage = async (prompt: string) => {
    try {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard'
        })
      });

      if (!response.ok) {
        throw new Error(`Image generation failed: ${response.status}`);
      }

      const data = await response.json();
      return data.data[0]?.url;
    } catch (error) {
      console.error('Error generating image:', error);
      throw error;
    }
  };

  const generateSessionTitle = (firstMessage: string) => {
    return firstMessage.length > 30 
      ? firstMessage.substring(0, 30) + '...' 
      : firstMessage;
  };

  const saveCurrentSession = () => {
    if (messages.length <= 1) return; // Don't save sessions with only the initial message

    const sessionTitle = generateSessionTitle(
      messages.find(m => m.role === 'user')?.content || 'New Chat'
    );

    const newSession: ChatSession = {
      id: currentSessionId,
      title: sessionTitle,
      timestamp: new Date(),
      messages: [...messages],
      isActive: false
    };

    setChatSessions(prev => {
      const existing = prev.find(s => s.id === currentSessionId);
      if (existing) {
        return prev.map(s => 
          s.id === currentSessionId 
            ? { ...newSession, isActive: false }
            : { ...s, isActive: false }
        );
      }
      return [...prev, newSession].map(s => ({ ...s, isActive: false }));
    });
  };

  const startNewChat = () => {
    saveCurrentSession();
    
    const newSessionId = Date.now().toString();
    setCurrentSessionId(newSessionId);
    setMessages([
      {
        id: '1',
        content: "Hello! I'm your AI assistant. I can chat with you and generate images using DALL·E 3. How can I help you today?",
        role: 'assistant',
        timestamp: new Date()
      }
    ]);
    setSidebarOpen(false);
  };

  const selectSession = (sessionId: string) => {
    saveCurrentSession();
    
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
      setChatSessions(prev => 
        prev.map(s => ({ ...s, isActive: s.id === sessionId }))
      );
    }
    setSidebarOpen(false);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your OpenAI API key to continue.",
        variant: "destructive"
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Determine if this should be an image generation request
      const shouldGenerateImage = imageMode || isImageRequest(input.trim());

      if (shouldGenerateImage) {
        // Generate image using DALL·E 3
        const imageUrl = await generateImage(input.trim());
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: `I've generated an image based on your prompt: "${input.trim()}"`,
          role: 'assistant',
          timestamp: new Date(),
          imageUrl: imageUrl
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Regular chat completion
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [
              ...messages.map(msg => ({
                role: msg.role,
                content: msg.content
              })),
              { role: 'user', content: userMessage.content }
            ],
            max_tokens: 1000,
            temperature: 0.7
          })
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.choices[0]?.message?.content || 'Sorry, I could not generate a response.',
          role: 'assistant',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to get response from AI. Please check your API key and try again.",
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Main Chat Area */}
      <div className="flex flex-col flex-1">
        {/* Header */}
        <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-2xl font-bold text-white">AI Chat Assistant</h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-400 hover:text-white"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="flex gap-2 mb-3">
              <Input
                type="password"
                placeholder="Enter your OpenAI API key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              />
              <Button
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
                onClick={() => {
                  setApiKey('');
                  toast({
                    title: "API Key Cleared",
                    description: "Your API key has been removed."
                  });
                }}
              >
                Clear
              </Button>
            </div>
            
            {/* Model Selector and Image Mode Toggle */}
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <Label htmlFor="model-select" className="text-gray-300 text-sm">Model:</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger id="model-select" className="w-40 bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="gpt-4o" className="text-white hover:bg-gray-600">gpt-4o</SelectItem>
                    <SelectItem value="gpt-3.5-turbo" className="text-white hover:bg-gray-600">gpt-3.5-turbo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Label htmlFor="image-mode" className="text-gray-300 text-sm flex items-center gap-1">
                  <Image className="w-4 h-4" />
                  Image Mode:
                </Label>
                <Switch
                  id="image-mode"
                  checked={imageMode}
                  onCheckedChange={setImageMode}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-700 rounded-lg p-4 max-w-xs sm:max-w-md">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="flex-shrink-0 bg-gray-800 border-t border-gray-700 p-4">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={imageMode ? "Describe the image you want to generate..." : "Type your message..."}
                disabled={isLoading}
                className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
            {imageMode && (
              <p className="text-xs text-gray-400 mt-1">
                Image Mode is active - your message will be used to generate an image
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <ChatSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sessions={chatSessions}
        onNewChat={startNewChat}
        onSelectSession={selectSession}
      />
    </div>
  );
};

export default ChatInterface;
