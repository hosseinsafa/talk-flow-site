
import React from 'react';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  
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
        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
          {message.content}
        </div>
        <div
          className={`
            text-xs mt-2 opacity-70
            ${isUser ? 'text-blue-100' : 'text-gray-400'}
          `}
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
