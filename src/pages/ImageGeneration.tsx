
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Image, 
  Sparkles
} from 'lucide-react';

const ImageGeneration = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    // Simulate API call
    setTimeout(() => {
      setIsGenerating(false);
    }, 3000);
  };

  const quickOptions = [
    { label: 'Style', icon: '🎨' },
    { label: 'Image prompt', icon: '🖼️' },
    { label: 'Image style', icon: '✨' },
    { label: '2:3', icon: '📐' },
    { label: '1K', icon: '🔍' },
    { label: 'Raw', icon: '⚡' }
  ];

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="flex items-center mb-8">
        <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center mr-3">
          <Image className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-white text-2xl font-normal">Image</h1>
      </div>

      {/* Main Input Container */}
      <div className="w-full max-w-2xl">
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-6 mb-4">
          <Textarea
            placeholder="Describe an image and click generate..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="bg-transparent border-none text-white placeholder-gray-400 resize-none min-h-[60px] text-base focus:outline-none focus:ring-0 p-0"
            rows={3}
          />
          
          {/* Quick Options */}
          <div className="flex flex-wrap gap-2 mt-4 mb-4">
            {quickOptions.map((option, index) => (
              <Badge
                key={index}
                variant="outline"
                className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 cursor-pointer px-3 py-1 text-sm"
              >
                <span className="mr-1">{option.icon}</span>
                {option.label}
              </Badge>
            ))}
          </div>

          {/* Generate Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="bg-white text-black hover:bg-gray-200 px-6 py-2 rounded-md font-medium"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Model Info */}
      <div className="absolute bottom-6 left-6">
        <div className="flex items-center text-gray-400 text-sm">
          <span className="mr-2">Model</span>
          <span className="text-white">Krea 1</span>
          <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {/* Show Examples */}
      <div className="absolute bottom-6 right-6">
        <button className="text-gray-400 text-sm hover:text-white transition-colors">
          Show examples
        </button>
      </div>

      {/* Generated Images Display Area */}
      {isGenerating && (
        <div className="mt-8 w-full max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-900 rounded-lg h-64 flex items-center justify-center border border-gray-700">
              <div className="text-center">
                <div className="w-12 h-12 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">Generating...</p>
              </div>
            </div>
            <div className="bg-gray-900 rounded-lg h-64 flex items-center justify-center border border-gray-700">
              <div className="text-center">
                <div className="w-12 h-12 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">Generating...</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGeneration;
