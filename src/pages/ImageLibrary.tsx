import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Download,
  Trash2,
  Image,
  X
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
  model_used: string;
  aspect_ratio: string;
}

const ImageLibrary = () => {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [filteredImages, setFilteredImages] = useState<GeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState('all');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('all');
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);

  const { user, session } = useAuth();
  const { user: phoneUser, isAuthenticated: isPhoneAuth } = useKavenegarAuth();
  const currentUser = phoneUser || user;

  useEffect(() => {
    const fetchImages = async () => {
      setIsLoading(true);
      if (!currentUser) {
        setIsLoading(false);
        return;
      }

      try {
        let query = supabase
          .from('image_library')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching images:', error);
          toast.error('Failed to load images');
        } else {
          setImages(data || []);
        }
      } catch (error) {
        console.error('Error fetching images:', error);
        toast.error('Failed to load images');
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  }, [currentUser]);

  useEffect(() => {
    let filtered = [...images];

    if (searchQuery) {
      filtered = filtered.filter(image =>
        image.prompt.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedModel !== 'all') {
      filtered = filtered.filter(image => image.model_used === selectedModel);
    }

    if (selectedAspectRatio !== 'all') {
      filtered = filtered.filter(image => image.aspect_ratio === selectedAspectRatio);
    }

    setFilteredImages(filtered);
  }, [images, searchQuery, selectedModel, selectedAspectRatio]);

  const handleDownload = (image: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = image.image_url;
    link.download = `image-${image.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Image downloaded');
  };

  const handleDelete = async (imageId: string) => {
    try {
      const { error } = await supabase
        .from('image_library')
        .delete()
        .eq('id', imageId);

      if (error) {
        console.error('Error deleting image:', error);
        toast.error('Failed to delete image');
      } else {
        setImages(prevImages => prevImages.filter(image => image.id !== imageId));
        toast.success('Image deleted');
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#121212] text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">مکتبة الصور</h1>
            <p className="text-gray-400">جميع الصور المولدة بواسطة الذكاء الاصطناعي</p>
          </div>
          
          {/* Filters */}
          <div className="flex items-center gap-4">
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-40 bg-[#2A2A2A] border-gray-700 text-white">
                <SelectValue placeholder="تصفية حسب النموذج" />
              </SelectTrigger>
              <SelectContent className="bg-[#2A2A2A] border-gray-700">
                <SelectItem value="all" className="text-white">جميع النماذج</SelectItem>
                <SelectItem value="flux_schnell" className="text-white">Flux Schnell</SelectItem>
                <SelectItem value="flux_dev" className="text-white">Flux Dev</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedAspectRatio} onValueChange={setSelectedAspectRatio}>
              <SelectTrigger className="w-32 bg-[#2A2A2A] border-gray-700 text-white">
                <SelectValue placeholder="النسبة" />
              </SelectTrigger>
              <SelectContent className="bg-[#2A2A2A] border-gray-700">
                <SelectItem value="all" className="text-white">جميع النسب</SelectItem>
                <SelectItem value="1:1" className="text-white">1:1</SelectItem>
                <SelectItem value="16:9" className="text-white">16:9</SelectItem>
                <SelectItem value="9:16" className="text-white">9:16</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            type="text"
            placeholder="البحث في الصور..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md bg-[#2A2A2A] border-gray-700 text-white placeholder-gray-500"
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-400">جاري التحميل...</div>
          </div>
        )}

        {/* Images Grid */}
        {!isLoading && filteredImages.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredImages.map((image) => (
              <div key={image.id} className="bg-[#1A1A1A] rounded-lg overflow-hidden hover:bg-[#222] transition-colors">
                <div className="relative aspect-square">
                  <img
                    src={image.image_url}
                    alt={image.prompt}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setSelectedImage(image)}
                  />
                </div>
                
                <div className="p-4">
                  <p className="text-sm text-gray-300 mb-3 line-clamp-2">
                    {image.prompt}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs bg-gray-800 border-gray-700 text-gray-300">
                        {image.model_used}
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-gray-800 border-gray-700 text-gray-300">
                        {image.aspect_ratio}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white p-1"
                        onClick={() => handleDownload(image)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-red-400 p-1"
                        onClick={() => handleDelete(image.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredImages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Image className="w-16 h-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">لا توجد صور</h3>
            <p className="text-gray-500 text-center max-w-md">
              {searchQuery ? 'لم يتم العثور على صور تطابق البحث' : 'لم تقم بإنشاء أي صور بعد. ابدأ بإنشاء صور جديدة!'}
            </p>
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="relative">
              <img
                src={selectedImage.image_url}
                alt={selectedImage.prompt}
                className="w-full h-auto rounded-lg"
              />
              
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white"
                onClick={() => setSelectedImage(null)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="mt-4 p-4 bg-[#1A1A1A] rounded-lg">
              <p className="text-white mb-4">{selectedImage.prompt}</p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-gray-800 border-gray-700 text-gray-300">
                    {selectedImage.model_used}
                  </Badge>
                  <Badge variant="outline" className="bg-gray-800 border-gray-700 text-gray-300">
                    {selectedImage.aspect_ratio}
                  </Badge>
                  <span className="text-sm text-gray-400">
                    {new Date(selectedImage.created_at).toLocaleDateString('ar-SA')}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(selectedImage)}
                    className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    تحميل
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(selectedImage.id)}
                    className="bg-red-800 border-red-700 text-white hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    حذف
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageLibrary;
