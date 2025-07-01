
import React from 'react';
import { Plus, MessageSquare, X, Search, Library, Code, Video, Zap, FolderPlus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

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

  const navigationItems = [
    { icon: Plus, label: 'New Chat', action: onNewChat, highlight: true },
    { icon: Search, label: 'Search Chats', action: () => {} },
    { icon: Library, label: 'Library', action: () => {} },
    { icon: Code, label: 'Codex', action: () => {} },
    { icon: Video, label: 'Sora', action: () => {} },
    { icon: Sparkles, label: 'GPTs', action: () => {} },
    { icon: FolderPlus, label: 'New Project', action: () => {} },
    { icon: Zap, label: 'Ai', action: () => {} },
  ];

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
          fixed left-0 top-0 h-full w-64 bg-[#171717] border-r border-white/10
          transform transition-all duration-300 ease-in-out z-50
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0 lg:z-auto
          ${isOpen ? 'lg:block' : 'lg:block'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif]">ChatGPT</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8 lg:hidden"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Navigation Items */}
          <div className="p-3 space-y-1">
            {navigationItems.map((item, index) => (
              <Button
                key={index}
                onClick={item.action}
                variant="ghost"
                className={`w-full justify-start gap-3 h-10 text-sm font-medium transition-all hover:scale-105 ${
                  item.highlight 
                    ? 'bg-white/10 text-white hover:bg-white/20' 
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Button>
            ))}
          </div>

          {/* Chat Sessions List */}
          <ScrollArea className="flex-1 px-3">
            <div className="space-y-4 pb-4">
              {groupOrder.map(group => {
                const groupSessions = groupedSessions[group];
                if (!groupSessions || groupSessions.length === 0) return null;

                return (
                  <div key={group} className="animate-fade-in">
                    <div className="text-xs font-medium text-gray-400 mb-2 px-2 uppercase tracking-wider font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif]">
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
                              w-full p-3 rounded-lg text-left transition-all text-sm hover:scale-105
                              ${currentSessionId === session.id 
                                ? 'bg-white/10 text-white' 
                                : 'text-gray-300 hover:bg-white/5 hover:text-white'
                              }
                            `}
                          >
                            <div className="truncate font-medium font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif]">
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
                <div className="text-center text-gray-400 py-12 animate-fade-in">
                  <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif]">No conversations yet</p>
                  <p className="text-xs text-gray-500 mt-1 font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif]">Start a new chat to begin</p>
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
