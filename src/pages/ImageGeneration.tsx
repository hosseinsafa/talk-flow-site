import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Download,
  Upload,
  ChevronUp,
  MoreHorizontal,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useKavenegarAuth } from '@/hooks/useKavenegarAuth';
import { toast } from 'sonner';
import ProjectSidebar from '@/components/ProjectSidebar';

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
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [lastGenerationTime, setLastGenerationTime] = useState<number>(0);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [selectedImageForModal, setSelectedImageForModal] = useState<GeneratedImage | null>(null);

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

  // Advanced settings for Flux Dev
  const [advancedSettings, setAdvancedSettings] = useState({
    guidance_scale: 3.5,
    num_inference_steps: 50
  });

  // Cooldown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (cooldownRemaining > 0) {
      interval = setInterval(() => {
        setCooldownRemaining(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [cooldownRemaining]);

  // Load images for the current project
  useEffect(() => {
    const loadProjectImages = async () => {
      if (!currentUser || !currentProjectId) return;

      try {
        const { data, error } = await supabase
          .from('image_library')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('session_id', currentProjectId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Failed to load project images:', error);
          return;
        }

        if (data) {
          const imagesWithAspectRatio = data.map(img => ({
            id: img.id,
            prompt: img.prompt || '',
            image_url: img.image_url || '',
            status: 'completed',
            created_at: img.created_at || '',
            model_type: img.model_used || 'flux_schnell',
            width: 1024,
            height: 1024,
            aspect_ratio: img.aspect_ratio || '1:1'
          }));
          setGeneratedImages(imagesWithAspectRatio);
        }
      } catch (error) {
        console.error('Error loading project images:', error);
      }
    };

    loadProjectImages();
  }, [currentUser, currentProjectId]);

  // Create new project session
  const handleNewProject = () => {
    const newProjectId = crypto.randomUUID();
    setCurrentProjectId(newProjectId);
    setGeneratedImages([]);
    setSelectedImageIndex(null);
    setPrompt('');
  };

  // Select existing project
  const handleProjectSelect = (projectId: string) => {
    setCurrentProjectId(projectId);
    setSelectedImageIndex(null);
  };

  // Handle aspect ratio change
  const handleAspectRatioChange = (aspectRatio: string) => {
    setSettings(prev => ({
      ...prev,
      aspect_ratio: aspectRatio
    }));
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

    // Check cooldown
    const now = Date.now();
    const timeSinceLastGeneration = now - lastGenerationTime;
    const minCooldown = 2000; // 2 seconds minimum cooldown

    if (timeSinceLastGeneration < minCooldown) {
      const remainingCooldown = Math.ceil((minCooldown - timeSinceLastGeneration) / 1000);
      setCooldownRemaining(remainingCooldown);
      toast.error(`Please wait ${remainingCooldown} seconds before generating another image`);
      return;
    }

    setIsGenerating(true);
    setLastGenerationTime(now);
    
    try {
      const enhancedPrompt = `${prompt}, ${settings.style} style`;
      
      // Prepare payload for new API structure
      const payload: any = {
        prompt: enhancedPrompt,
        model: settings.model,
        aspect_ratio: settings.aspect_ratio,
      };

      // Add advanced settings for Flux Dev
      if (settings.model === 'flux_dev') {
        payload.guidance_scale = advancedSettings.guidance_scale;
        payload.num_inference_steps = advancedSettings.num_inference_steps;
      }

      console.log('🚀 Sending generation request:', payload);
      
      const { data, error } = await supabase.functions.invoke('replicate-generate', {
        body: payload,
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        }
      });

      if (error) {
        console.error('Generation error:', error);
        
        // Handle rate limiting specifically
        if (error.message?.includes('429') || error.message?.includes('throttled') || error.message?.includes('rate limit')) {
          toast.error('Rate limit reached. Please wait a moment before trying again.');
          setCooldownRemaining(5); // 5 second cooldown for rate limit
          setIsGenerating(false);
          return;
        }
        
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
      
      // Handle rate limiting in catch block too
      if (error.message?.includes('429') || error.message?.includes('throttled') || error.message?.includes('rate limit')) {
        toast.error('Rate limit reached. Please wait a moment before trying again.');
        setCooldownRemaining(5);
      } else {
        toast.error(`Error generating image: ${error.message}`);
      }
      
      setIsGenerating(false);
    }
  };

  // Poll for generation result with retry logic for 429 errors
  const pollForResult = async (generationId: string, retryCount = 0) => {
    const maxAttempts = 60;
    const maxRetries = 3;
    
    const poll = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('replicate-status', {
          body: { generation_id: generationId },
          headers: session?.access_token ? {
            Authorization: `Bearer ${session.access_token}`,
          } : {}
        });

        if (error) {
          // Handle rate limiting in status check
          if (error.message?.includes('429') || error.message?.includes('throttled')) {
            if (retryCount < maxRetries) {
              console.log(`Rate limited during status check, retrying in 3 seconds (attempt ${retryCount + 1})`);
              setTimeout(() => {
                pollForResult(generationId, retryCount + 1);
              }, 3000);
              return;
            } else {
              toast.error('Status check rate limited. Please check back later.');
              setIsGenerating(false);
              setCurrentGenerationId(null);
              return;
            }
          }
          
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

        // Continue polling if still processing
        if (retryCount < maxAttempts) {
          setTimeout(() => {
            pollForResult(generationId, 0); // Reset retry count for next poll
          }, 10000);
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

  // Updated saveToImageLibrary to use current project
  const saveToImageLibrary = async (
    prompt: string, 
    imageUrl: string, 
    modelUsed: string,
    aspectRatio: string
  ) => {
    if (!currentUser) {
      console.log('⚠️ No user found, skipping image library save');
      return;
    }

    // Create a new project if none exists
    const sessionId = currentProjectId || crypto.randomUUID();
    if (!currentProjectId) {
      setCurrentProjectId(sessionId);
    }

    try {
      console.log('💾 Saving image to library...');
      
      const { data, error } = await supabase
        .from('image_library')
        .insert({
          user_id: currentUser.id,
          session_id: sessionId,
          prompt: prompt,
          image_url: imageUrl,
          model_used: modelUsed,
          aspect_ratio: aspectRatio
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Image library save error:', error);
        throw error;
      }

      console.log('✅ Image saved to library:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Error saving image to library:', error);
      throw error;
    }
  };

  // Save to image library
  const saveImageGeneration = async (
    prompt: string, 
    imageUrl: string, 
    metadata?: { 
      generation_count?: number; 
      all_urls?: string[];
      settings?: {
        size: string;
        quality: string;
        style: string;
        model: string;
      };
    }
  ) => {
    if (!user) {
      console.log('⚠️ No user found, skipping database save');
      return;
    }

    try {
      console.log('💾 Saving ChatGPT-quality image generation to database...');
      
      const promptNote = metadata?.generation_count 
        ? `ChatGPT-quality generation (${metadata.generation_count} images generated at ${metadata.settings?.size || '1024x1024'})`
        : 'Single ChatGPT-quality generation';
      
      const { data, error } = await supabase
        .from('image_generations')
        .insert({
          user_id: user.id,
          prompt: prompt,
          image_url: imageUrl,
          model_type: 'dall-e-3-chatgpt-quality',
          status: 'completed',
          width: 1024,
          height: 1024,
          steps: 50,
          cfg_scale: 7.0,
          error_message: metadata ? JSON.stringify({
            type: 'chatgpt_quality_metadata',
            generation_count: metadata.generation_count,
            all_urls_count: metadata.all_urls?.length,
            settings: metadata.settings,
            note: promptNote
          }) : null
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Database save error:', error);
        throw error;
      }

      console.log('✅ ChatGPT-quality image generation saved:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Error saving ChatGPT-quality image generation:', error);
      throw error;
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

  // Download image function - direct download without opening new window
  const handleDownloadImage = async (imageUrl: string, prompt: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `generated-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Image downloaded');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download image');
    }
  };

  // Check if generation is disabled
  const isGenerationDisabled = () => {
    return !prompt.trim() || isGenerating || !currentUser || cooldownRemaining > 0;
  };

  // Get button text based on state
  const getButtonText = () => {
    if (isGenerating) return 'Generating...';
    if (cooldownRemaining > 0) return `Wait ${cooldownRemaining}s`;
    return 'Generate';
  };

  const selectedImage = selectedImageIndex !== null ? generatedImages[selectedImageIndex] : null;

  return (
    <div className="h-[calc(100vh-4rem)] bg-[#121212] text-white flex overflow-hidden">
      {/* Project Sidebar */}
      <ProjectSidebar
        currentProjectId={currentProjectId}
        onProjectSelect={handleProjectSelect}
        onNewProject={handleNewProject}
      />

      {/* Main Content - adjusted for sidebar */}
      <div className="flex-1 flex flex-col ml-16">
        {/* Generated Images Display */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {generatedImages.map((image, index) => (
              <div key={image.id} className="bg-[#1A1A1A] rounded-lg overflow-hidden">
                {/* Image - 50% size preview */}
                <div className="relative cursor-pointer" onClick={() => setSelectedImageForModal(image)}>
                  <img
                    src={image.image_url}
                    alt={image.prompt}
                    className="w-1/2 h-auto mx-auto hover:opacity-90 transition-opacity"
                  />
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Prompt section */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-300">Prompt</h3>
                    </div>
                    <p className="text-sm text-[#E5E5E5] leading-relaxed mb-3">
                      {image.prompt}
                    </p>
                    
                    {/* Tags */}
                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant="outline" className="text-xs bg-gray-800 border-gray-700 text-gray-300">
                        {image.model_type || 'flux_schnell'}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadImage(image.image_url, image.prompt);
                          }}
                        >
                          <Download className="w-4 h-4" />
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

            {generatedImages.length === 0 && (
              <div className="text-center text-gray-400 py-12">
                <div className="text-lg mb-2">No images in this project yet</div>
                <div className="text-sm">Start generating images to see them here</div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Input Area - unified background color */}
        <div className="border-t border-gray-800 bg-[#121212] p-6">
          <div className="max-w-4xl mx-auto">
            {/* Input Field */}
            <div className="relative mb-6">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe an image and click generate..."
                className="w-full bg-[#2A2A2A] border-gray-700 text-white placeholder-gray-500 pr-32 min-h-[150px] max-h-[300px] text-sm rounded-lg resize-none pb-16"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey && !isGenerationDisabled()) {
                    handleGenerate();
                  }
                }}
              />
              
              <Button
                onClick={handleGenerate}
                disabled={isGenerationDisabled()}
                className={`absolute right-3 bottom-3 px-6 h-10 text-sm font-medium rounded-md ${
                  isGenerationDisabled() 
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                    : 'bg-white text-black hover:bg-gray-200'
                }`}
              >
                {getButtonText()}
              </Button>
            </div>

            {/* Show rate limiting info */}
            {cooldownRemaining > 0 && (
              <div className="mb-3 text-center">
                <p className="text-sm text-yellow-400">
                  ⏱️ Rate limit protection active. Please wait {cooldownRemaining} seconds.
                </p>
              </div>
            )}

            {/* Controls - removed "Show examples" button */}
            <div className="flex items-center justify-start text-sm">
              <div className="flex items-center gap-4">
                <Select value={settings.model} onValueChange={(value) => setSettings(prev => ({ ...prev, model: value }))}>
                  <SelectTrigger className="w-32 bg-[#2A2A2A] border-gray-700 text-white h-8">
                    <SelectValue placeholder="Model" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2A2A2A] border-gray-700">
                    <SelectItem value="flux_schnell" className="text-white">Flux Schnell</SelectItem>
                    <SelectItem value="flux_dev" className="text-white">Flux Dev</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={settings.style} onValueChange={(value) => setSettings(prev => ({ ...prev, style: value }))}>
                  <SelectTrigger className="w-32 bg-[#2A2A2A] border-gray-700 text-white h-8">
                    <SelectValue placeholder="Style" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2A2A2A] border-gray-700">
                    <SelectItem value="realistic" className="text-white">Realistic</SelectItem>
                    <SelectItem value="cinematic" className="text-white">Cinematic</SelectItem>
                    <SelectItem value="anime" className="text-white">Anime</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={settings.aspect_ratio} onValueChange={handleAspectRatioChange}>
                  <SelectTrigger className="w-24 bg-[#2A2A2A] border-gray-700 text-white h-8">
                    <SelectValue placeholder="Ratio" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2A2A2A] border-gray-700">
                    <SelectItem value="1:1" className="text-white">1:1</SelectItem>
                    <SelectItem value="16:9" className="text-white">16:9</SelectItem>
                    <SelectItem value="9:16" className="text-white">9:16</SelectItem>
                    <SelectItem value="4:3" className="text-white">4:3</SelectItem>
                    <SelectItem value="3:4" className="text-white">3:4</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white h-8 px-3">
                  <Upload className="w-4 h-4 mr-2" />
                  Image prompt
                </Button>
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

            {/* Advanced Settings for Flux Dev */}
            {settings.model === 'flux_dev' && (
              <div className="mt-4 p-4 bg-[#2A2A2A] rounded-lg border border-gray-700">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Advanced Settings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Guidance Scale: {advancedSettings.guidance_scale}</label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.5"
                      value={advancedSettings.guidance_scale}
                      onChange={(e) => setAdvancedSettings(prev => ({ ...prev, guidance_scale: parseFloat(e.target.value) }))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Steps: {advancedSettings.num_inference_steps}</label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={advancedSettings.num_inference_steps}
                      onChange={(e) => setAdvancedSettings(prev => ({ ...prev, num_inference_steps: parseInt(e.target.value) }))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full-size Image Modal */}
      {selectedImageForModal && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImageForModal(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <Button
              variant="ghost"
              size="sm"
              className="absolute -top-12 right-0 text-white hover:text-gray-300 z-10"
              onClick={() => setSelectedImageForModal(null)}
            >
              <X className="w-6 h-6" />
            </Button>
            <img
              src={selectedImageForModal.image_url}
              alt={selectedImageForModal.prompt}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

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
                setPrompt("cat in neon cyberpunk alley");
                setSettings(prev => ({ ...prev, aspect_ratio: '1:1' }));
                setShowExamples(false);
              }}>
                <div className="w-full h-32 bg-gray-700 rounded mb-3 flex items-center justify-center">
                  <span className="text-gray-400 text-sm">Flux Schnell Example</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  cat in neon cyberpunk alley, 1:1
                </p>
              </div>
              
              <div className="bg-[#2A2A2A] rounded-lg p-4 cursor-pointer hover:bg-[#333] transition-colors" onClick={() => {
                setPrompt("futuristic skyline, dramatic lighting");
                setSettings(prev => ({ ...prev, aspect_ratio: '16:9', model: 'flux_dev' }));
                setShowExamples(false);
              }}>
                <div className="w-full h-32 bg-gray-700 rounded mb-3 flex items-center justify-center">
                  <span className="text-gray-400 text-sm">Flux Dev Example</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  futuristic skyline, dramatic lighting, 16:9
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
