
import React from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';

interface ChatHeaderProps {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  onToggleSidebar: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ selectedModel, setSelectedModel, onToggleSidebar }) => {
  const isMobile = useIsMobile();

  return (
    <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#212121] sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="text-gray-400 hover:text-white hover:bg-white/10 h-10 w-10"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <h1 className={`font-semibold text-white ${isMobile ? 'text-lg' : 'text-xl'}`}>ChatGPT</h1>
      </div>
      
      <div className="flex items-center gap-3">
        <Select value={selectedModel} onValueChange={setSelectedModel}>
          <SelectTrigger className={`h-9 text-sm border-white/20 bg-[#2f2f2f] text-white ${isMobile ? 'w-28' : 'w-36'}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#2f2f2f] border-white/20 text-white">
            <SelectItem value="gpt-4o-mini" title="Fast and cost-effective GPT-4o variant for chat">GPT-4o Mini</SelectItem>
            <SelectItem value="gpt-4o">GPT-4o</SelectItem>
            <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
            <SelectItem value="gpt-3.5-turbo">GPT-3.5</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default ChatHeader;
