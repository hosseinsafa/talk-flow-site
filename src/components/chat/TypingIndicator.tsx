
import React from 'react';
import { Bot } from 'lucide-react';

const TypingIndicator: React.FC = () => {
  return (
    <div className="bg-[#2f2f2f]">
      <div className="max-w-4xl mx-auto px-6 py-6 flex gap-6">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-[#19c37d] text-white flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-1">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
