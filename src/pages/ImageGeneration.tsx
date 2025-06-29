
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Image, 
  Sparkles, 
  Download, 
  Settings, 
  Palette,
  Wand2
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

  const styles = [
    { name: 'واقع‌گرایانه', value: 'realistic' },
    { name: 'هنری', value: 'artistic' },
    { name: 'انیمیشنی', value: 'anime' },
    { name: 'طراحی', value: 'sketch' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Image className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">تولید تصویر هوشمند</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            تصاویر حرفه‌ای و هنری را با توضیح ساده متنی ایجاد کنید
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Panel */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-800 border-gray-700 h-fit">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Wand2 className="w-5 h-5" />
                  تنظیمات تولید
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    توضیح تصویر
                  </label>
                  <Textarea
                    placeholder="تصویر مورد نظر خود را توضیح دهید..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 min-h-[120px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    استایل تصویر
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {styles.map((style) => (
                      <Button
                        key={style.value}
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:border-purple-500 hover:text-white"
                      >
                        {style.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-400">تنظیمات پیشرفته</span>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2"></div>
                      در حال تولید...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 ml-2" />
                      تولید تصویر
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  نتایج تولید
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isGenerating ? (
                  <div className="flex items-center justify-center h-96 bg-gray-700 rounded-lg">
                    <div className="text-center">
                      <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-300">در حال تولید تصویر...</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Placeholder for generated images */}
                    <div className="bg-gray-700 rounded-lg h-64 flex items-center justify-center">
                      <div className="text-center text-gray-400">
                        <Image className="w-12 h-12 mx-auto mb-2" />
                        <p>تصویر تولید شده اینجا نمایش داده می‌شود</p>
                      </div>
                    </div>
                    <div className="bg-gray-700 rounded-lg h-64 flex items-center justify-center">
                      <div className="text-center text-gray-400">
                        <Image className="w-12 h-12 mx-auto mb-2" />
                        <p>نسخه دوم</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sample Gallery */}
            <Card className="bg-gray-800 border-gray-700 mt-6">
              <CardHeader>
                <CardTitle className="text-white">گالری نمونه</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="relative group">
                      <div className="bg-gray-700 rounded-lg h-32 flex items-center justify-center">
                        <Image className="w-8 h-8 text-gray-500" />
                      </div>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <Button size="sm" variant="ghost" className="text-white">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageGeneration;
