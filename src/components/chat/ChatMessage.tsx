
import React from 'react';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp?: Date;
  imageUrl?: string;
  isStreaming?: boolean;
}

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  
  // Function to detect if text contains Persian characters
  const containsPersian = (text: string) => {
    const persianRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    return persianRegex.test(text);
  };

  const hasPersianText = containsPersian(message.content);
  
  return (
    <div className="group w-full bg-[#2f2f2f] animate-fade-in">
      <div className="max-w-4xl mx-auto px-6 py-6 flex gap-6">
        {/* Content - No avatar icons */}
        <div className="flex-1 min-w-0">
          <div 
            className="text-white leading-relaxed"
            dir={hasPersianText ? 'rtl' : 'ltr'}
            style={{
              textAlign: hasPersianText ? 'right' : 'left',
              unicodeBidi: 'plaintext',
              fontSize: '16px',
              lineHeight: '28px',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
          >
            <div className="whitespace-pre-wrap break-words">
              {message.content}
              {message.isStreaming && (
                <span className="inline-block w-2 h-5 bg-white ml-1 animate-pulse"></span>
              )}
            </div>
          </div>
          
          {/* Display generated image if available */}
          {message.imageUrl && (
            <div className="mt-4 animate-scale-in">
              <img 
                src={message.imageUrl} 
                alt="Generated image"
                className="rounded-xl max-w-full h-auto shadow-lg"
                style={{ maxHeight: '400px' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
