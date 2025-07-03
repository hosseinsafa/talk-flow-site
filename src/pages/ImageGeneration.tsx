
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Plus,
  Trash2,
  Download,
  Upload,
  Settings,
  ChevronUp,
  MoreHorizontal
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useKavenegarAuth } from '@/hooks/useKavenegarAuth';
import { toast } from 'sonner';

interface GeneratedImage {
  id: string;
  prompt: string;
  image_url: string;
  status: string;
  created_at: string;
  model_type: string;
  width: number;
  height: number;
  aspect_ratio: string;
}

interface GenerationSettings {
  model: string;
  style: string;
  aspect_ratio: string;
  width: number;
  height: number;
}

const ImageGeneration = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [showExamples, setShowExamples] = useState(false);
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);
  
  const { user, session } = useAuth();
  const { user: phoneUser, isAuthenticated: isPhoneAuth } = useKavenegarAuth();
  const currentUser = phoneUser || user;

  const [settings, setSettings] = useState<GenerationSettings>({
    model: 'flux_schnell',
    style: 'realistic',
    aspect_ratio: '1:1',
    width: 1024,
    height: 1024
  });

  // Load only image generation history (not chat messages)
  useEffect(() => {
    const loadGenerationHistory = async () => {
      if (!currentUser) return;

      try {
        const { data, error } = await supabase
          .from('image_generations')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('Failed to load generation history:', error);
          return;
        }

        if (data) {
          const imagesWithAspectRatio = data.map(img => ({
            ...img,
            aspect_ratio: `${img.width}:${img.height}` || '1:1'
          }));
          setGeneratedImages(imagesWithAspectRatio);
        }
      } catch (error) {
        console.error('Error loading generation history:', error);
      }
    };

    loadGenerationHistory();
  }, [currentUser]);

  // Handle aspect ratio change
  const handleAspectRatioChange = (aspectRatio: string) => {
    const aspectRatioOptions = [
      { value: '1:1', label: '1:1', width: 1024, height: 1024 },
      { value: '16:9', label: '16:9', width: 1280, height: 720 },
      { value: '9:16', label: '9:16', width: 720, height: 1280 },
      { value: '4:3', label: '4:3', width: 1024, height: 768 },
      { value: '3:4', label: '3:4', width: 768, height: 1024 }
    ];
    
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

  // Generate image using the replicate-generate function
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    if (!currentUser) {
      toast.error('Please sign in to generate images');
      return;
    }

    setIsGenerating(true);
    
    try {
      const enhancedPrompt = `${prompt}, ${settings.style} style`;
      
      const { data, error } = await supabase.functions.invoke('replicate-generate', {
        body: {
          prompt: enhancedPrompt,
          model: settings.model,
          width: settings.width,
          height: settings.height,
          steps: settings.model === 'flux_schnell' ? 4 : 50,
          cfg_scale: settings.model === 'flux_schnell' ? 1.0 : 3.5,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        }
      });

      if (error) {
        console.error('Generation error:', error);
        toast.error(`Error generating image: ${error.message}`);
        setIsGenerating(false);
        return;
      }

      if (data.generation_id) {
        setCurrentGenerationId(data.generation_id);
        toast.success('Image generation started...');
        pollForResult(data.generation_id);
      }
      
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(`Error generating image: ${error.message}`);
      setIsGenerating(false);
    }
  };

  // Poll for generation result
  const pollForResult = async (generationId: string) => {
    const maxAttempts = 60;
    let attempts = 0;
    
    const poll = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('replicate-status', {
          body: { generation_id: generationId },
          headers: session?.access_token ? {
            Authorization: `Bearer ${session.access_token}`,
          } : {}
        });

        if (error) {
          console.error('Status check error:', error);
          throw error;
        }

        if (data.status === 'completed' && data.image_url) {
          const newImage = {
            ...data,
            aspect_ratio: settings.aspect_ratio
          };
          setGeneratedImages(prev => [newImage, ...prev]);
          setSelectedImageIndex(0);
          
          // Save to image library
          await saveToImageLibrary(data.prompt, data.image_url, settings.model, settings.aspect_ratio);
          
          toast.success('Image generated successfully!');
          setIsGenerating(false);
          setCurrentGenerationId(null);
          return;
        }

        if (data.status === 'failed') {
          toast.error(`Generation failed: ${data.error_message || 'Unknown error'}`);
          setIsGenerating(false);
          setCurrentGenerationId(null);
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000);
        } else {
          toast.error('Generation timeout');
          setIsGenerating(false);
          setCurrentGenerationId(null);
        }
        
      } catch (error) {
        console.error('Status check error:', error);
        toast.error(`Status check error: ${error.message}`);
        setIsGenerating(false);
        setCurrentGenerationId(null);
      }
    };

    poll();
  };

  // Save to image library
  const saveToImageLibrary = async (prompt: string, imageUrl: string, modelUsed: string, aspectRatio: string) => {
    if (!currentUser) return;

    try {
      await supabase
        .from('image_library')
        .insert({
          user_id: currentUser.id,
          prompt: prompt,
          image_url: imageUrl,
          model_used: modelUsed,
          aspect_ratio: aspectRatio
        });
    } catch (error) {
      console.error('Error saving to image library:', error);
    }
  };

  // Delete image
  const handleDeleteImage = async (imageId: string) => {
    try {
      const { error } = await supabase
        .from('image_generations')
        .delete()
        .eq('id', imageId);

      if (error) {
        toast.error('Failed to delete image');
        return;
      }

      setGeneratedImages(prev => prev.filter(img => img.id !== imageId));
      toast.success('Image deleted');
    } catch (error) {
      toast.error('Failed to delete image');
    }
  };

  // Download image
  const handleDownloadImage = (imageUrl: string, prompt: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `generated-image-${Date.now()}.png`;
    link.click();
    toast.success('Image downloaded');
  };

  const selectedImage = selectedImageIndex !== null ? generatedImages[selectedImageIndex] : null;

  return (
    <div className="h-screen bg-[#121212] text-white flex overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-16 bg-[#1A1A1A] border-r border-gray-800 flex flex-col py-4">
        {/* New Generation Button */}
        <div className="px-2 mb-4">
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12 bg-gray-800 hover:bg-gray-700 text-white rounded-lg"
            onClick={() => {
              setPrompt('');
              setSelectedImageIndex(null);
            }}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {/* History Thumbnails */}
        <div className="flex-1 overflow-y-auto px-2 space-y-2">
          {generatedImages.map((image, index) => (
            <div
              key={image.id}
              className={`relative w-12 h-12 rounded-lg overflow-hidden cursor-pointer border transition-all ${
                selectedImageIndex === index 
                  ? 'border-blue-500 ring-1 ring-blue-500/50' 
                  : 'border-gray-700 hover:border-gray-600'
              }`}
              onClick={() => setSelectedImageIndex(index)}
            >
              <img
                src={image.image_url}
                alt={image.prompt}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Generated Images Display */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {generatedImages.map((image, index) => (
              <div key={image.id} className="bg-[#1A1A1A] rounded-lg overflow-hidden">
                {/* Image */}
                <div className="relative">
                  <img
                    src={image.image_url}
                    alt={image.prompt}
                    className="w-full h-auto"
                  />
                  
                  {/* Overlay with branding */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-2 text-xs text-gray-400">
                    <span className="bg-black/50 px-2 py-1 rounded">MINIMAX</span>
                    <span className="bg-black/50 px-2 py-1 rounded">Hailuo AI</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Prompt section */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-300">Prompt</h3>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-[#E5E5E5] leading-relaxed mb-3">
                      {image.prompt}
                    </p>
                    
                    {/* Tags */}
                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant="outline" className="text-xs bg-gray-800 border-gray-700 text-gray-300">
                        {image.model_type || 'Image-01'}
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-gray-800 border-gray-700 text-gray-300">
                        Enable Optimization
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-gray-800 border-gray-700 text-gray-300">
                        {image.aspect_ratio}
                      </Badge>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                        onClick={() => handleDownloadImage(image.image_url, image.prompt)}
                      >
                        <ChevronUp className="w-4 h-4 mr-2" />
                        Upscale
                      </Button>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-white"
                          onClick={() => handleDownloadImage(image.image_url, image.prompt)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-white"
                          onClick={() => handleDeleteImage(image.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-white"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Input Area */}
        <div className="border-t border-gray-800 bg-[#1A1A1A] p-6">
          <div className="max-w-4xl mx-auto">
            {/* Input Field */}
            <div className="relative mb-4">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe an image and click generate..."
                className="w-full bg-[#2A2A2A] border-gray-700 text-white placeholder-gray-500 pr-24 h-12 text-sm rounded-lg"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !isGenerating) {
                    handleGenerate();
                  }
                }}
              />
              
              <Button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating || !currentUser}
                className="absolute right-2 top-2 bg-white text-black hover:bg-gray-200 px-4 h-8 text-sm font-medium rounded-md"
              >
                {isGenerating ? 'Generating...' : 'Generate'}
              </Button>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <Select value={settings.model} onValueChange={(value) => setSettings(prev => ({ ...prev, model: value }))}>
                  <SelectTrigger className="w-32 bg-[#2A2A2A] border-gray-700 text-white h-8">
                    <SelectValue placeholder="Image Model" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2A2A2A] border-gray-700">
                    <SelectItem value="flux_schnell" className="text-white">Flux Schnell</SelectItem>
                    <SelectItem value="flux_dev" className="text-white">Flux Dev</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={settings.style} onValueChange={(value) => setSettings(prev => ({ ...prev, style: value }))}>
                  <SelectTrigger className="w-32 bg-[#2A2A2A] border-gray-700 text-white h-8">
                    <SelectValue placeholder="Image style" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2A2A2A] border-gray-700">
                    <SelectItem value="realistic" className="text-white">Realistic</SelectItem>
                    <SelectItem value="cinematic" className="text-white">Cinematic</SelectItem>
                    <SelectItem value="anime" className="text-white">Anime</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white h-8 px-3">
                  <Upload className="w-4 h-4 mr-2" />
                  Image prompt
                </Button>

                <Select value={settings.aspect_ratio} onValueChange={handleAspectRatioChange}>
                  <SelectTrigger className="w-24 bg-[#2A2A2A] border-gray-700 text-white h-8">
                    <SelectValue placeholder="aspect ratio" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2A2A2A] border-gray-700">
                    <SelectItem value="1:1" className="text-white">1:1</SelectItem>
                    <SelectItem value="16:9" className="text-white">16:9</SelectItem>
                    <SelectItem value="9:16" className="text-white">9:16</SelectItem>
                  </SelectContent>
                </Select>

                <span className="text-gray-400 text-xs">image size</span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
                onClick={() => setShowExamples(true)}
              >
                <ChevronUp className="w-4 h-4 mr-2" />
                Show examples
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Examples Modal */}
      {showExamples && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Example Prompts</h2>
              <Button
                variant="ghost"
                onClick={() => setShowExamples(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#2A2A2A] rounded-lg p-4 cursor-pointer hover:bg-[#333] transition-colors" onClick={() => {
                setPrompt("A majestic golden lion with sleek fur prowls confidently through a rain-soaked metropolis at night, neon signs reflecting on wet asphalt as towering skyscrapers loom in the background, illuminated by dramatic cinematic lighting that highlights the predator's intense gaze and muscular frame against the urban jungle.");
                setShowExamples(false);
              }}>
                <img
                  src="/lovable-uploads/4b5b9e5c-903d-4279-b67b-506baae7c8f2.png"
                  alt="Example"
                  className="w-full h-32 object-cover rounded mb-3"
                />
                <p className="text-sm text-gray-300 leading-relaxed">
                  A majestic golden lion with sleek fur prowls confidently through a rain-soaked metropolis at night...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGeneration;
