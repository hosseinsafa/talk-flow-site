
import React from 'react';
import { Plus, MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { t } from '@/lib/localization';

interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
  isActive: boolean;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  onNewChat,
  onSelectSession
}) => {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={`
          fixed left-0 top-0 h-full w-80 bg-gray-800 border-r border-gray-700 
          transform transition-transform duration-300 ease-in-out z-50
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0 md:z-auto
          ${isOpen ? 'md:block' : 'md:hidden'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">{t.chat.chatHistory}</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-400 hover:text-white md:hidden"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* New Chat Button */}
          <div className="p-4">
            <Button
              onClick={onNewChat}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 ml-2" />
              {t.chat.newChat}
            </Button>
          </div>

          {/* Chat Sessions List */}
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-2">
              {sessions.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t.chat.noHistory}</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => onSelectSession(session.id)}
                    className={`
                      w-full p-3 rounded-lg text-right transition-colors
                      ${session.isActive 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }
                    `}
                  >
                    <div className="font-medium text-sm mb-1 truncate" dir="rtl">
                      {session.title}
                    </div>
                    <div className="text-xs opacity-70">
                      {session.timestamp.toLocaleDateString('fa-IR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  );
};

export default ChatSidebar;
