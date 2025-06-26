
import React from 'react';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
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
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
      <div
        className={`
          max-w-xs sm:max-w-md lg:max-w-lg xl:max-w-xl
          rounded-lg px-4 py-3 shadow-lg
          ${
            isUser
              ? 'bg-blue-600 text-white ml-auto'
              : 'bg-gray-700 text-gray-100 mr-auto'
          }
        `}
      >
        <div 
          className="whitespace-pre-wrap break-words text-sm leading-relaxed"
          dir={hasPersianText ? 'rtl' : 'ltr'}
          style={{
            textAlign: hasPersianText ? 'right' : 'left',
            unicodeBidi: 'plaintext'
          }}
        >
          {message.content}
        </div>
        
        {/* Display generated image if available */}
        {message.imageUrl && (
          <div className="mt-3">
            <img 
              src={message.imageUrl} 
              alt="Generated image"
              className="rounded-lg max-w-full h-auto shadow-md"
              style={{ maxHeight: '400px' }}
            />
          </div>
        )}
        
        <div
          className={`
            text-xs mt-2 opacity-70
            ${isUser ? 'text-blue-100' : 'text-gray-400'}
          `}
          dir={hasPersianText ? 'rtl' : 'ltr'}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
