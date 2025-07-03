
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus,
  Trash2,
  Download,
  Upload,
  Sparkles,
  Image as ImageIcon,
  Settings,
  Grid3X3
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

  // Model options
  const modelOptions = [
    { value: 'flux_schnell', label: 'Flux Schnell (Fast)' },
    { value: 'flux_dev', label: 'Flux Dev (Quality)' },
    { value: 'flux_context', label: 'Flux Context (Advanced)' }
  ];

  // Style options
  const styleOptions = [
    { value: 'realistic', label: 'Realistic' },
    { value: 'cinematic', label: 'Cinematic' },
    { value: 'anime', label: 'Anime' },
    { value: 'artistic', label: 'Artistic' },
    { value: 'fantasy', label: 'Fantasy' },
    { value: 'vintage', label: 'Vintage' }
  ];

  // Aspect ratio options
  const aspectRatioOptions = [
    { value: '1:1', label: '1:1', width: 1024, height: 1024 },
    { value: '16:9', label: '16:9', width: 1280, height: 720 },
    { value: '9:16', label: '9:16', width: 720, height: 1280 },
    { value: '4:3', label: '4:3', width: 1024, height: 768 },
    { value: '3:4', label: '3:4', width: 768, height: 1024 }
  ];

  // Example prompts
  const examplePrompts = [
    {
      prompt: "A majestic golden lion with sleek fur prowls confidently through a rain-soaked metropolis at night, neon signs reflecting on wet asphalt as towering skyscrapers loom in the background, illuminated by dramatic cinematic lighting that highlights the predator's intense gaze and muscular frame against the urban jungle.",
      image: "/lovable-uploads/4b5b9e5c-903d-4279-b67b-506baae7c8f2.png"
    },
    {
      prompt: "A cyberpunk warrior in neon-lit Tokyo streets",
      image: null
    },
    {
      prompt: "Serene mountain landscape at golden hour",
      image: null
    },
    {
      prompt: "Futuristic spaceship interior with holographic displays",
      image: null
    }
  ];

  // Load generation history
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

  // Generate image
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

  // Get current selected image
  const selectedImage = selectedImageIndex !== null ? generatedImages[selectedImageIndex] : null;

  return (
    <div className="h-screen bg-black text-white flex overflow-hidden">
      {/* Left Sidebar - History Thumbnails */}
      <div className="w-20 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* New Generation Button */}
        <div className="p-4 border-b border-gray-800">
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12 bg-gray-800 hover:bg-gray-700 text-white"
            onClick={() => {
              setPrompt('');
              setSelectedImageIndex(null);
            }}
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>

        {/* History Thumbnails */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {generatedImages.map((image, index) => (
            <div
              key={image.id}
              className={`relative w-16 h-16 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                selectedImageIndex === index 
                  ? 'border-blue-500 ring-2 ring-blue-500/50' 
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Center Image Display */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
          {selectedImage ? (
            <div className="max-w-4xl max-h-full flex flex-col items-center">
              <div className="relative rounded-lg overflow-hidden shadow-2xl mb-6">
                <img
                  src={selectedImage.image_url}
                  alt={selectedImage.prompt}
                  className="max-w-full max-h-[60vh] object-contain"
                />
              </div>
              
              {/* Image Info */}
              <div className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full">
                <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                  {selectedImage.prompt}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="text-xs">
                      {selectedImage.model_type === 'flux_schnell' ? 'Flux Schnell' : 'Flux Dev'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {selectedImage.aspect_ratio}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {selectedImage.width}×{selectedImage.height}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadImage(selectedImage.image_url, selectedImage.prompt)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteImage(selectedImage.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <p className="text-xl mb-2">No image selected</p>
              <p className="text-sm">Generate an image or select from history</p>
            </div>
          )}
        </div>

        {/* Bottom Prompt Input Bar */}
        <div className="border-t border-gray-800 bg-gray-900 p-6">
          <div className="max-w-6xl mx-auto">
            {/* Controls Row */}
            <div className="flex items-center gap-4 mb-4">
              {/* Model Selection */}
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-gray-400" />
                <Select value={settings.model} onValueChange={(value) => setSettings(prev => ({ ...prev, model: value }))}>
                  <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {modelOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-white">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Style Selection */}
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gray-400" />
                <Select value={settings.style} onValueChange={(value) => setSettings(prev => ({ ...prev, style: value }))}>
                  <SelectTrigger className="w-32 bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {styleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-white">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Aspect Ratio */}
              <div className="flex items-center gap-2">
                <Grid3X3 className="w-4 h-4 text-gray-400" />
                <Select value={settings.aspect_ratio} onValueChange={handleAspectRatioChange}>
                  <SelectTrigger className="w-24 bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {aspectRatioOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-white">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Image Size Display */}
              <div className="text-sm text-gray-400">
                {settings.width}×{settings.height}
              </div>

              {/* Reference Image Upload */}
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                Reference
              </Button>
            </div>

            {/* Prompt Input Row */}
            <div className="flex items-center gap-4">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe an image and click generate..."
                className="flex-1 bg-gray-800 border-gray-700 text-white placeholder-gray-400 h-12 text-base"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !isGenerating) {
                    handleGenerate();
                  }
                }}
              />
              
              <Button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating || !currentUser}
                className="bg-white text-black hover:bg-gray-200 px-8 h-12 font-medium"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
                    Generating...
                  </>
                ) : (
                  'Generate'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Show Examples Button */}
      <Button
        variant="ghost"
        className="fixed bottom-6 right-6 bg-gray-800 hover:bg-gray-700 text-white border border-gray-700"
        onClick={() => setShowExamples(true)}
      >
        Show Examples
      </Button>

      {/* Examples Modal */}
      {showExamples && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
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
              {examplePrompts.map((example, index) => (
                <Card key={index} className="bg-gray-800 border-gray-700 cursor-pointer hover:bg-gray-750 transition-colors" onClick={() => {
                  setPrompt(example.prompt);
                  setShowExamples(false);
                }}>
                  <CardContent className="p-4">
                    {example.image && (
                      <img
                        src={example.image}
                        alt="Example"
                        className="w-full h-32 object-cover rounded mb-3"
                      />
                    )}
                    <p className="text-sm text-gray-300 leading-relaxed">
                      {example.prompt}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGeneration;
