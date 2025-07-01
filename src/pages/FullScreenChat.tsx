
import React from 'react';
import StreamingChatInterface from '@/components/chat/StreamingChatInterface';

const FullScreenChat = () => {
  return (
    <div className="h-screen bg-[#212121] text-white overflow-hidden">
      <StreamingChatInterface />
    </div>
  );
};

export default FullScreenChat;
