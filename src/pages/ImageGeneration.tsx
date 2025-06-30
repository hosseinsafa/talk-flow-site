
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Image, 
  Sparkles,
  Settings,
  Download,
  History
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useKavenegarAuth } from '@/hooks/useKavenegarAuth';
import { toast } from 'sonner';

interface GenerationSettings {
  steps: number;
  cfg_scale: number;
  width: number;
  height: number;
  negative_prompt: string;
}

interface GeneratedImage {
  id: string;
  prompt: string;
  image_url: string;
  status: string;
  created_at: string;
}

const ImageGeneration = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { user: phoneUser, isAuthenticated: isPhoneAuth } = useKavenegarAuth();
  const currentUser = phoneUser || user;

  const [settings, setSettings] = useState<GenerationSettings>({
    steps: 20,
    cfg_scale: 7.0,
    width: 512,
    height: 512,
    negative_prompt: ''
  });

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('لطفاً پرامپت را وارد کنید');
      return;
    }

    if (!currentUser) {
      toast.error('لطفاً وارد حساب کاربری خود شوید');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      console.log('Starting image generation...');
      
      const { data, error } = await supabase.functions.invoke('comfyui-generate', {
        body: {
          prompt,
          negative_prompt: settings.negative_prompt,
          steps: settings.steps,
          cfg_scale: settings.cfg_scale,
          width: settings.width,
          height: settings.height,
        }
      });

      if (error) throw error;

      console.log('Generation started:', data);
      
      if (data.generation_id) {
        setCurrentGenerationId(data.generation_id);
        toast.success('تولید تصویر شروع شد...');
        
        // Start polling for results
        pollForResult(data.generation_id);
      }
      
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('خطا در تولید تصویر');
      setIsGenerating(false);
    }
  };

  const pollForResult = async (generationId: string) => {
    const maxAttempts = 30; // 5 minutes max (10 seconds * 30)
    let attempts = 0;
    
    const poll = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('comfyui-status', {
          body: { generation_id: generationId }
        });

        if (error) throw error;

        console.log('Status check:', data);

        if (data.status === 'completed' && data.image_url) {
          setGeneratedImages(prev => [data, ...prev]);
          toast.success('تصویر با موفقیت تولید شد!');
          setIsGenerating(false);
          setCurrentGenerationId(null);
          return;
        }

        if (data.status === 'failed') {
          toast.error('خطا در تولید تصویر');
          setIsGenerating(false);
          setCurrentGenerationId(null);
          return;
        }

        // Continue polling if still processing
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000); // Poll every 10 seconds
        } else {
          toast.error('زمان تولید تصویر به پایان رسید');
          setIsGenerating(false);
          setCurrentGenerationId(null);
        }
        
      } catch (error) {
        console.error('Status check error:', error);
        setIsGenerating(false);
        setCurrentGenerationId(null);
      }
    };

    poll();
  };

  const quickOptions = [
    { label: 'واقع‌گرایانه', value: 'realistic, detailed, high quality' },
    { label: 'هنری', value: 'artistic, creative, stylized' },
    { label: 'انیمه', value: 'anime style, manga' },
    { label: 'فانتزی', value: 'fantasy, magical, ethereal' },
    { label: 'کیفیت بالا', value: '4k, ultra detailed, masterpiece' },
    { label: 'سیاه و سفید', value: 'black and white, monochrome' }
  ];

  const handleQuickOption = (option: { label: string; value: string }) => {
    const currentPrompt = prompt.trim();
    const newPrompt = currentPrompt 
      ? `${currentPrompt}, ${option.value}`
      : option.value;
    setPrompt(newPrompt);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="flex items-center mb-8">
        <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center mr-3">
          <Image className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-white text-2xl font-normal">تولید تصویر</h1>
      </div>

      {/* Main Input Container */}
      <div className="w-full max-w-2xl">
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-6 mb-4">
          <Textarea
            placeholder="تصویر مورد نظر خود را توصیف کنید..."
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
                onClick={() => handleQuickOption(option)}
              >
                {option.label}
              </Badge>
            ))}
          </div>

          {/* Settings Toggle */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="text-gray-400 hover:text-white"
            >
              <Settings className="w-4 h-4 mr-2" />
              تنظیمات پیشرفته
            </Button>
          </div>

          {/* Advanced Settings */}
          {showSettings && (
            <div className="bg-gray-800 rounded-lg p-4 mb-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300 text-sm">تعداد مراحل</Label>
                  <Input
                    type="number"
                    value={settings.steps}
                    onChange={(e) => setSettings(prev => ({ ...prev, steps: parseInt(e.target.value) || 20 }))}
                    min="1"
                    max="100"
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">CFG Scale</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={settings.cfg_scale}
                    onChange={(e) => setSettings(prev => ({ ...prev, cfg_scale: parseFloat(e.target.value) || 7.0 }))}
                    min="1"
                    max="20"
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">عرض</Label>
                  <Input
                    type="number"
                    value={settings.width}
                    onChange={(e) => setSettings(prev => ({ ...prev, width: parseInt(e.target.value) || 512 }))}
                    step="64"
                    min="256"
                    max="1024"
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">ارتفاع</Label>
                  <Input
                    type="number"
                    value={settings.height}
                    onChange={(e) => setSettings(prev => ({ ...prev, height: parseInt(e.target.value) || 512 }))}
                    step="64"
                    min="256"
                    max="1024"
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-gray-300 text-sm">پرامپت منفی</Label>
                <Textarea
                  value={settings.negative_prompt}
                  onChange={(e) => setSettings(prev => ({ ...prev, negative_prompt: e.target.value }))}
                  placeholder="چیزهایی که نمی‌خواهید در تصویر باشد..."
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Generate Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating || !currentUser}
              className="bg-white text-black hover:bg-gray-200 px-6 py-2 rounded-md font-medium"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
                  در حال تولید...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  تولید تصویر
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Generated Images Display */}
      {generatedImages.length > 0 && (
        <div className="w-full max-w-4xl mt-8">
          <h2 className="text-white text-xl font-semibold mb-4 flex items-center">
            <History className="w-5 h-5 mr-2" />
            تصاویر تولید شده
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {generatedImages.map((image) => (
              <div key={image.id} className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
                <div className="aspect-square bg-gray-800 flex items-center justify-center">
                  {image.image_url ? (
                    <img 
                      src={image.image_url} 
                      alt={image.prompt}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-gray-400">تصویر در حال بارگذاری...</div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-gray-300 text-sm line-clamp-2 mb-2">{image.prompt}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs">
                      {new Date(image.created_at).toLocaleDateString('fa-IR')}
                    </span>
                    {image.image_url && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = image.image_url;
                          link.download = `generated-image-${image.id}.png`;
                          link.click();
                        }}
                        className="text-gray-400 hover:text-white"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generation Status */}
      {isGenerating && (
        <div className="mt-8 w-full max-w-2xl">
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mr-4"></div>
              <div className="text-white">
                در حال تولید تصویر... این ممکن است چند دقیقه طول بکشد.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Model Info */}
      <div className="absolute bottom-6 left-6">
        <div className="flex items-center text-gray-400 text-sm">
          <span className="mr-2">مدل</span>
          <span className="text-white">ComfyUI Local</span>
        </div>
      </div>
    </div>
  );
};

export default ImageGeneration;
