
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Search,
  Download,
  Trash2,
  Filter,
  Grid3X3,
  Grid2X2,
  Calendar,
  Image as ImageIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useKavenegarAuth } from '@/hooks/useKavenegarAuth';
import { toast } from 'sonner';

interface LibraryImage {
  id: string;
  prompt: string;
  image_url: string;
  model_used: string;
  aspect_ratio: string;
  created_at: string;
}

const ImageLibrary = () => {
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [filteredImages, setFilteredImages] = useState<LibraryImage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState('all');
  const [selectedRatio, setSelectedRatio] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'large'>('grid');
  const [isLoading, setIsLoading] = useState(true);

  const { user, session } = useAuth();
  const { user: phoneUser, isAuthenticated: isPhoneAuth } = useKavenegarAuth();
  const currentUser = phoneUser || user;

  // Load images from library
  useEffect(() => {
    const loadImages = async () => {
      if (!currentUser) return;

      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('image_library')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Failed to load images:', error);
          toast.error('Failed to load images');
          return;
        }

        if (data) {
          setImages(data);
          setFilteredImages(data);
        }
      } catch (error) {
        console.error('Error loading images:', error);
        toast.error('Error loading images');
      } finally {
        setIsLoading(false);
      }
    };

    loadImages();
  }, [currentUser]);

  // Filter and search logic
  useEffect(() => {
    let filtered = [...images];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(img => 
        img.prompt?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Model filter
    if (selectedModel !== 'all') {
      filtered = filtered.filter(img => img.model_used === selectedModel);
    }

    // Aspect ratio filter
    if (selectedRatio !== 'all') {
      filtered = filtered.filter(img => img.aspect_ratio === selectedRatio);
    }

    // Sort
    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    setFilteredImages(filtered);
  }, [images, searchQuery, selectedModel, selectedRatio, sortBy]);

  // Delete image
  const handleDeleteImage = async (imageId: string) => {
    try {
      const { error } = await supabase
        .from('image_library')
        .delete()
        .eq('id', imageId);

      if (error) {
        toast.error('Failed to delete image');
        return;
      }

      setImages(prev => prev.filter(img => img.id !== imageId));
      toast.success('Image deleted');
    } catch (error) {
      toast.error('Failed to delete image');
    }
  };

  // Download image
  const handleDownloadImage = (imageUrl: string, prompt: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${prompt.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}.png`;
    link.click();
    toast.success('Image downloaded');
  };

  if (!currentUser) {
    return (
      <div className="h-screen bg-[#121212] text-white flex items-center justify-center">
        <div className="text-center">
          <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold mb-2">Sign in to view your library</h2>
          <p className="text-gray-400">Your generated images will appear here after signing in</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#121212] text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#1A1A1A] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-white">Image Library</h1>
              <p className="text-gray-400 mt-1">Browse and manage your generated images</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="text-white"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'large' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('large')}
                className="text-white"
              >
                <Grid2X2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by prompt..."
                className="pl-10 bg-[#2A2A2A] border-gray-700 text-white placeholder-gray-500"
              />
            </div>

            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-40 bg-[#2A2A2A] border-gray-700 text-white">
                <SelectValue placeholder="All Models" />
              </SelectTrigger>
              <SelectContent className="bg-[#2A2A2A] border-gray-700">
                <SelectItem value="all" className="text-white">All Models</SelectItem>
                <SelectItem value="dall-e-3" className="text-white">DALL·E 3</SelectItem>
                <SelectItem value="flux_schnell" className="text-white">Flux Schnell</SelectItem>
                <SelectItem value="flux_dev" className="text-white">Flux Dev</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedRatio} onValueChange={setSelectedRatio}>
              <SelectTrigger className="w-32 bg-[#2A2A2A] border-gray-700 text-white">
                <SelectValue placeholder="All Ratios" />
              </SelectTrigger>
              <SelectContent className="bg-[#2A2A2A] border-gray-700">
                <SelectItem value="all" className="text-white">All Ratios</SelectItem>
                <SelectItem value="1:1" className="text-white">1:1</SelectItem>
                <SelectItem value="16:9" className="text-white">16:9</SelectItem>
                <SelectItem value="9:16" className="text-white">9:16</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32 bg-[#2A2A2A] border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#2A2A2A] border-gray-700">
                <SelectItem value="newest" className="text-white">Newest</SelectItem>
                <SelectItem value="oldest" className="text-white">Oldest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-400">Loading your images...</p>
              </div>
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="text-center py-16">
              <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">
                {images.length === 0 ? 'No images yet' : 'No images found'}
              </h3>
              <p className="text-gray-400">
                {images.length === 0 
                  ? 'Start generating images to see them here'
                  : 'Try adjusting your search or filters'
                }
              </p>
            </div>
          ) : (
            <div className={`grid gap-6 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                : 'grid-cols-1 lg:grid-cols-2'
            }`}>
              {filteredImages.map((image) => (
                <div key={image.id} className="bg-[#1A1A1A] rounded-lg overflow-hidden group hover:bg-[#202020] transition-colors">
                  <div className="relative">
                    <img
                      src={image.image_url}
                      alt={image.prompt || 'Generated image'}
                      className={`w-full object-cover ${
                        viewMode === 'grid' ? 'h-64' : 'h-96'
                      }`}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDownloadImage(image.image_url, image.prompt || 'image')}
                        className="bg-white/20 hover:bg-white/30 text-white border-0"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteImage(image.id)}
                        className="bg-red-500/80 hover:bg-red-500 text-white border-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="p-4">
                    <p className="text-sm text-gray-300 line-clamp-2 mb-3">
                      {image.prompt || 'No prompt available'}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {image.model_used && (
                          <Badge variant="outline" className="text-xs bg-gray-800 border-gray-700 text-gray-300">
                            {image.model_used}
                          </Badge>
                        )}
                        {image.aspect_ratio && (
                          <Badge variant="outline" className="text-xs bg-gray-800 border-gray-700 text-gray-300">
                            {image.aspect_ratio}
                          </Badge>
                        )}
                      </div>
                      <span className="text-gray-500">
                        {new Date(image.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageLibrary;
