
import React, { useRef, useEffect } from 'react';
import { Send, ArrowUp, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ input, setInput, onSubmit, isLoading }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as any);
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  return (
    <div className="p-6 bg-[#212121]">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={onSubmit} className="relative">
          <div className="relative bg-[#2f2f2f] border border-white/20 rounded-3xl shadow-lg hover:border-white/30 transition-colors">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message ChatGPT..."
              disabled={isLoading}
              className="resize-none border-0 bg-transparent px-6 py-4 pr-20 text-white placeholder-gray-400 focus:ring-0 focus:outline-none min-h-[56px] max-h-[200px] leading-6 text-base font-[system-ui,-apple-system,BlinkMacSystemFont,'Segue_UI',Roboto,sans-serif]"
              style={{ height: 'auto' }}
            />
            <div className="absolute right-3 bottom-3 flex items-center gap-2">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full text-gray-400 hover:text-white hover:bg-white/10"
              >
                <Mic className="w-4 h-4" />
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                size="icon"
                className="h-8 w-8 rounded-full bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowUp className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </form>
        <p className="text-xs text-gray-500 text-center mt-3 font-[system-ui,-apple-system,BlinkMacSystemFont,'Segue_UI',Roboto,sans-serif]">
          ChatGPT can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
};

export default ChatInput;
