
import React from 'react';
import { Loader2 } from 'lucide-react';

interface ImageGenerationLoaderProps {
  message: string;
}

const ImageGenerationLoader: React.FC<ImageGenerationLoaderProps> = ({ message }) => {
  return (
    <div className="bg-[#2f2f2f] rounded-lg p-4 max-w-md">
      <div className="flex items-center justify-center h-64 bg-gray-600 rounded-lg mb-3">
        <div className="flex flex-col items-center text-gray-300">
          <Loader2 className="w-12 h-12 animate-spin mb-3" />
          <p className="text-sm">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default ImageGenerationLoader;
