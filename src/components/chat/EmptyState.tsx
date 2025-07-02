
import React from 'react';
import { useAuth } from '@/hooks/useAuth';

const EmptyState: React.FC = () => {
  const { user } = useAuth();

  const getUserName = () => {
    return user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';
  };

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center text-white max-w-2xl px-6">
        <h2 className="text-4xl font-semibold mb-6">How can I help, {getUserName()}?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
          <div className="p-4 rounded-xl bg-[#2f2f2f] hover:bg-[#3f3f3f] transition-colors cursor-pointer">
            <h3 className="font-medium mb-2">Create a presentation</h3>
            <p className="text-sm text-gray-400">about the solar system</p>
          </div>
          <div className="p-4 rounded-xl bg-[#2f2f2f] hover:bg-[#3f3f3f] transition-colors cursor-pointer">
            <h3 className="font-medium mb-2">Generate an image</h3>
            <p className="text-sm text-gray-400">of a futuristic city</p>
          </div>
          <div className="p-4 rounded-xl bg-[#2f2f2f] hover:bg-[#3f3f3f] transition-colors cursor-pointer">
            <h3 className="font-medium mb-2">Explain quantum physics</h3>
            <p className="text-sm text-gray-400">in simple terms</p>
          </div>
          <div className="p-4 rounded-xl bg-[#2f2f2f] hover:bg-[#3f3f3f] transition-colors cursor-pointer">
            <h3 className="font-medium mb-2">Plan a trip</h3>
            <p className="text-sm text-gray-400">to Japan for 7 days</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmptyState;
