
import React, { useState } from 'react';

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
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  
  // Function to detect if text contains Persian characters
  const containsPersian = (text: string) => {
    const persianRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    return persianRegex.test(text);
  };

  const hasPersianText = containsPersian(message.content);
  
  const handleImageLoad = () => {
    console.log('✅ Image loaded successfully:', message.imageUrl);
    setImageLoading(false);
  };

  const handleImageError = () => {
    console.error('❌ Failed to load image:', message.imageUrl);
    setImageError(true);
    setImageLoading(false);
  };
  
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
              {imageLoading && !imageError && (
                <div className="bg-gray-600 rounded-xl animate-pulse flex items-center justify-center" style={{ width: '400px', height: '300px' }}>
                  <div className="flex flex-col items-center text-gray-300">
                    <div className="w-8 h-8 border-2 border-gray-300 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <span className="text-sm">Loading image...</span>
                  </div>
                </div>
              )}
              
              {imageError ? (
                <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 max-w-md">
                  <div className="flex items-center text-red-400">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.768 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-sm">
                      {hasPersianText ? 'خطا در بارگذاری تصویر' : 'Failed to load image'}
                    </span>
                  </div>
                </div>
              ) : (
                <img 
                  src={message.imageUrl} 
                  alt="Generated image"
                  className="rounded-xl max-w-full h-auto shadow-lg"
                  style={{ 
                    maxHeight: '400px',
                    display: imageLoading ? 'none' : 'block'
                  }}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
