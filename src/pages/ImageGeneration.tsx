
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Image, 
  Sparkles,
  Settings,
  Download,
  History,
  ChevronDown,
  ChevronUp,
  AspectRatio as AspectRatioIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useKavenegarAuth } from '@/hooks/useKavenegarAuth';
import { toast } from 'sonner';
import { ModelSelector } from '@/components/ModelSelector';

interface GenerationSettings {
  steps: number;
  cfg_scale: number;
  width: number;
  height: number;
  negative_prompt: string;
  aspect_ratio: string;
}

interface GeneratedImage {
  id: string;
  prompt: string;
  image_url: string;
  status: string;
  created_at: string;
  model_type: string;
}

const ImageGeneration = () => {
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('flux_schnell');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);
  
  const { user, session } = useAuth();
  const { user: phoneUser, isAuthenticated: isPhoneAuth } = useKavenegarAuth();
  const currentUser = phoneUser || user;

  const [settings, setSettings] = useState<GenerationSettings>({
    steps: 4,
    cfg_scale: 1.0,
    width: 1024,
    height: 1024,
    negative_prompt: '',
    aspect_ratio: '1:1'
  });

  // Aspect ratio options with Persian labels and corresponding dimensions
  const aspectRatioOptions = [
    { label: 'مربع 1:1', value: '1:1', width: 1024, height: 1024 },
    { label: 'افقی 16:9', value: '16:9', width: 1280, height: 720 },
    { label: 'عمودی 9:16', value: '9:16', width: 720, height: 1280 },
  ];

  // Update dimensions when aspect ratio changes
  const handleAspectRatioChange = (aspectRatio: string) => {
    const option = aspectRatioOptions.find(opt => opt.value === aspectRatio);
    if (option) {
      setSettings(prev => ({
        ...prev,
        aspect_ratio: aspectRatio,
        width: option.width,
        height: option.height
      }));
    }
  };

  // Update default settings based on selected model
  useEffect(() => {
    if (selectedModel === 'flux_schnell') {
      setSettings(prev => ({
        ...prev,
        steps: 4,
        cfg_scale: 1.0
      }));
    } else if (selectedModel === 'flux_dev') {
      setSettings(prev => ({
        ...prev,
        steps: 50,
        cfg_scale: 3.5
      }));
    }
  }, [selectedModel]);

  // Load user's generation history
  useEffect(() => {
    const loadGenerationHistory = async () => {
      if (!currentUser) return;

      try {
        const { data, error } = await supabase
          .from('image_generations')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) {
          console.error('Failed to load generation history:', error);
          return;
        }

        if (data) {
          setGeneratedImages(data);
        }
      } catch (error) {
        console.error('Error loading generation history:', error);
      }
    };

    loadGenerationHistory();
  }, [currentUser]);

  const refreshSessionIfNeeded = async () => {
    try {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session check error:', error);
        return null;
      }

      // Check if token is expired or will expire soon (within 5 minutes)
      if (currentSession?.expires_at) {
        const expiryTime = new Date(currentSession.expires_at * 1000);
        const now = new Date();
        const timeUntilExpiry = expiryTime.getTime() - now.getTime();
        const fiveMinutes = 5 * 60 * 1000;

        if (timeUntilExpiry < fiveMinutes) {
          console.log('Token expires soon, refreshing...');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.error('Session refresh failed:', refreshError);
            toast.error('جلسه کاربری منقضی شده - لطفاً دوباره وارد شوید');
            return null;
          }
          
          console.log('Session refreshed successfully');
          return refreshData.session;
        }
      }

      return currentSession;
    } catch (error) {
      console.error('Session refresh error:', error);
      return null;
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('لطفاً پرامپت را وارد کنید');
      return;
    }

    if (!currentUser) {
      toast.error('لطفاً وارد حساب کاربری خود شوید');
      return;
    }

    if (selectedModel === 'comfyui_local') {
      toast.error('مدل ComfyUI Local هنوز در دسترس نیست');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      console.log('Starting image generation...');
      
      // Refresh session if needed before making the request
      const validSession = await refreshSessionIfNeeded();
      
      if (!validSession?.access_token) {
        console.error('No valid session or access token found');
        toast.error('جلسه کاربری منقضی شده است - لطفاً دوباره وارد شوید');
        setIsGenerating(false);
        return;
      }

      console.log('Session validated successfully');

      // Call the new Replicate generate function with dynamic width/height
      const { data, error } = await supabase.functions.invoke('replicate-generate', {
        body: {
          prompt,
          negative_prompt: settings.negative_prompt,
          steps: settings.steps,
          cfg_scale: settings.cfg_scale,
          width: settings.width,
          height: settings.height,
          model: selectedModel,
        },
        headers: {
          Authorization: `Bearer ${validSession.access_token}`,
        }
      });

      console.log('Function invoke result:', { data, error });

      if (error) {
        console.error('Function invoke error:', error);
        
        if (error.message?.includes('Authentication') || error.message?.includes('401')) {
          toast.error('جلسه کاربری منقضی شده - لطفاً دوباره وارد شوید');
        } else {
          toast.error(`خطا در تولید تصویر: ${error.message || 'خطای نامشخص'}`);
        }
        
        setIsGenerating(false);
        return;
      }

      console.log('Generation started:', data);
      
      if (data.generation_id) {
        setCurrentGenerationId(data.generation_id);
        toast.success('تولید تصویر شروع شد...');
        
        // Start polling for results
        pollForResult(data.generation_id);
      }
      
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(`خطا در تولید تصویر: ${error.message || 'خطای نامشخص'}`);
      setIsGenerating(false);
    }
  };

  const pollForResult = async (generationId: string) => {
    const maxAttempts = 60; // 10 minutes max (10 seconds * 60)
    let attempts = 0;
    
    const poll = async () => {
      try {
        console.log(`Status check attempt ${attempts + 1} for generation:`, generationId);
        
        const validSession = await refreshSessionIfNeeded();
        
        const { data, error } = await supabase.functions.invoke('replicate-status', {
          body: { generation_id: generationId },
          headers: validSession?.access_token ? {
            Authorization: `Bearer ${validSession.access_token}`,
          } : {}
        });

        if (error) {
          console.error('Status check error:', error);
          throw error;
        }

        console.log('Status check result:', data);

        if (data.status === 'completed' && data.image_url) {
          // Add to the beginning of the list
          setGeneratedImages(prev => [data, ...prev]);
          toast.success('تصویر با موفقیت تولید شد!');
          setIsGenerating(false);
          setCurrentGenerationId(null);
          return;
        }

        if (data.status === 'failed') {
          toast.error(`خطا در تولید تصویر: ${data.error_message || 'خطای نامشخص'}`);
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
        toast.error(`خطا در بررسی وضعیت: ${error.message || 'خطای نامشخص'}`);
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
          {/* Model Selector */}
          <div className="mb-6">
            <ModelSelector value={selectedModel} onValueChange={setSelectedModel} />
          </div>

          {/* Aspect Ratio Selector */}
          <div className="mb-6">
            <Label className="text-gray-300 text-sm mb-2 block flex items-center">
              <AspectRatioIcon className="w-4 h-4 mr-2" />
              انتخاب نسبت تصویر
            </Label>
            <Select value={settings.aspect_ratio} onValueChange={handleAspectRatioChange}>
              <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                <SelectValue placeholder="انتخاب نسبت تصویر" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                {aspectRatioOptions.map((option) => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                    className="text-white hover:bg-gray-700 focus:bg-gray-700"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-gray-400 text-xs mt-1">
              ابعاد: {settings.width} × {settings.height}
            </div>
          </div>

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
              {showSettings ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
            </Button>
          </div>

          {/* Advanced Settings */}
          {showSettings && (
            <div className="bg-gray-800 rounded-lg p-4 mb-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300 text-sm">عرض</Label>
                  <Input
                    type="number"
                    value={settings.width}
                    onChange={(e) => setSettings(prev => ({ ...prev, width: parseInt(e.target.value) || 1024 }))}
                    step="64"
                    min="256"
                    max="1536"
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">ارتفاع</Label>
                  <Input
                    type="number"
                    value={settings.height}
                    onChange={(e) => setSettings(prev => ({ ...prev, height: parseInt(e.target.value) || 1024 }))}
                    step="64"
                    min="256"
                    max="1536"
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>
              </div>

              {selectedModel === 'flux_dev' && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-gray-300 text-sm">تعداد مراحل</Label>
                      <span className="text-gray-400 text-sm">{settings.steps}</span>
                    </div>
                    <Slider
                      value={[settings.steps]}
                      onValueChange={(value) => setSettings(prev => ({ ...prev, steps: value[0] }))}
                      min={1}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-gray-300 text-sm">CFG Scale</Label>
                      <span className="text-gray-400 text-sm">{settings.cfg_scale}</span>
                    </div>
                    <Slider
                      value={[settings.cfg_scale]}
                      onValueChange={(value) => setSettings(prev => ({ ...prev, cfg_scale: value[0] }))}
                      min={1}
                      max={20}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                </>
              )}

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
              disabled={!prompt.trim() || isGenerating || !currentUser || selectedModel === 'comfyui_local'}
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
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs">
                      {image.model_type === 'flux_schnell' ? 'Flux Schnell' : 
                       image.model_type === 'flux_dev' ? 'Flux Dev' : 'ComfyUI'}
                    </Badge>
                    <span className="text-gray-500 text-xs">
                      {new Date(image.created_at).toLocaleDateString('fa-IR')}
                    </span>
                  </div>
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
                      className="text-gray-400 hover:text-white w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      دانلود
                    </Button>
                  )}
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
                در حال تولید تصویر با {selectedModel === 'flux_schnell' ? 'Flux Schnell' : 'Flux Dev'}...
                <br />
                <span className="text-gray-400 text-sm">
                  نسبت تصویر: {aspectRatioOptions.find(opt => opt.value === settings.aspect_ratio)?.label} 
                  ({settings.width}×{settings.height})
                </span>
                <br />
                <span className="text-gray-400 text-sm">این ممکن است چند دقیقه طول بکشد.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debug Info - Only show in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 left-4 bg-gray-800 p-2 rounded text-xs text-gray-300">
          <div>User: {currentUser ? 'Authenticated' : 'Not authenticated'}</div>
          <div>Auth Method: {user ? 'Supabase' : phoneUser ? 'Phone' : 'None'}</div>
          <div>Session: {session ? 'Active' : 'None'}</div>
          <div>Model: {selectedModel}</div>
          <div>Aspect Ratio: {settings.aspect_ratio} ({settings.width}×{settings.height})</div>
        </div>
      )}

      {/* Model Info */}
      <div className="absolute bottom-6 left-6">
        <div className="flex items-center text-gray-400 text-sm">
          <span className="mr-2">مدل فعال</span>
          <span className="text-white">
            {selectedModel === 'flux_schnell' ? 'Flux Schnell' : 
             selectedModel === 'flux_dev' ? 'Flux Dev' : 'ComfyUI Local'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ImageGeneration;
