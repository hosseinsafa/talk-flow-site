
import React from 'react';
import { Plus, MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { t } from '@/lib/localization';

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onNewChat,
  onSelectSession
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    if (date >= today) {
      return 'Today';
    } else if (date >= yesterday) {
      return 'Yesterday';
    } else if (date >= weekAgo) {
      return 'Previous 7 days';
    } else {
      return 'Older';
    }
  };

  const groupSessionsByDate = (sessions: ChatSession[]) => {
    const groups: { [key: string]: ChatSession[] } = {};
    
    sessions.forEach(session => {
      const group = formatDate(session.updated_at);
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(session);
    });

    return groups;
  };

  const groupedSessions = groupSessionsByDate(sessions);
  const groupOrder = ['Today', 'Yesterday', 'Previous 7 days', 'Older'];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={`
          fixed left-0 top-0 h-full w-64 bg-[#171717] border-r border-gray-800/50
          transform transition-transform duration-300 ease-in-out z-50
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0 lg:z-auto
          ${isOpen ? 'lg:block' : 'lg:hidden'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-800/50">
            <h2 className="text-sm font-medium text-white">ChatGPT</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-gray-800 h-8 w-8 lg:hidden"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* New Chat Button */}
          <div className="p-3">
            <Button
              onClick={onNewChat}
              className="w-full bg-transparent border border-gray-600 hover:bg-gray-800 text-white text-sm h-9 justify-start gap-2"
              variant="outline"
            >
              <Plus className="w-4 h-4" />
              New chat
            </Button>
          </div>

          {/* Chat Sessions List */}
          <ScrollArea className="flex-1 px-3">
            <div className="space-y-4 pb-4">
              {groupOrder.map(group => {
                const groupSessions = groupedSessions[group];
                if (!groupSessions || groupSessions.length === 0) return null;

                return (
                  <div key={group}>
                    <div className="text-xs font-medium text-gray-400 mb-2 px-2">
                      {group}
                    </div>
                    <div className="space-y-1">
                      {groupSessions
                        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                        .map((session) => (
                          <button
                            key={session.id}
                            onClick={() => onSelectSession(session.id)}
                            className={`
                              w-full p-2 rounded-lg text-left transition-colors text-sm
                              ${currentSessionId === session.id 
                                ? 'bg-gray-800 text-white' 
                                : 'text-gray-300 hover:bg-gray-800/50'
                              }
                            `}
                          >
                            <div className="truncate">
                              {session.title}
                            </div>
                          </button>
                        ))
                      }
                    </div>
                  </div>
                );
              })}
              {sessions.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No conversations yet</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  );
};

export default ChatSidebar;
