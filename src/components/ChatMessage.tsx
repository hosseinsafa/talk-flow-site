
import React from 'react';
import { User, Bot } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp?: Date;
  imageUrl?: string;
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
    <div className={`group w-full ${isUser ? 'bg-transparent' : 'bg-[#f7f7f8] dark:bg-[#2f2f2f]'}`}>
      <div className="max-w-3xl mx-auto px-4 py-6 flex gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className={`w-8 h-8 rounded-sm flex items-center justify-center ${
            isUser 
              ? 'bg-[#19c37d] text-white' 
              : 'bg-[#10a37f] text-white'
          }`}>
            {isUser ? (
              <User className="w-4 h-4" />
            ) : (
              <Bot className="w-4 h-4" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div 
            className="text-gray-800 dark:text-gray-100 leading-7"
            dir={hasPersianText ? 'rtl' : 'ltr'}
            style={{
              textAlign: hasPersianText ? 'right' : 'left',
              unicodeBidi: 'plaintext',
              fontSize: '16px',
              lineHeight: '28px'
            }}
          >
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
          </div>
          
          {/* Display generated image if available */}
          {message.imageUrl && (
            <div className="mt-4">
              <img 
                src={message.imageUrl} 
                alt="Generated image"
                className="rounded-lg max-w-full h-auto shadow-md"
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
