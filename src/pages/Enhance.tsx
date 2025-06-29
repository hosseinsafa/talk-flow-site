
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Upload, 
  Download, 
  Image, 
  Settings,
  Sparkles,
  RefreshCw
} from 'lucide-react';

const Enhance = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEnhance = () => {
    if (!uploadedImage) return;
    
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
    }, 3000);
  };

  const enhanceOptions = [
    { name: 'Super Resolution', description: 'افزایش رزولوشن تا 4 برابر' },
    { name: 'حذف نویز', description: 'حذف نویز و بهبود وضوح' },
    { name: 'رنگ‌آمیزی', description: 'رنگ‌آمیزی تصاویر سیاه و سفید' },
    { name: 'بازسازی چهره', description: 'بهبود جزئیات چهره' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
              <Zap className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">بهبود کیفیت تصاویر</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            کیفیت تصاویر خود را با استفاده از هوش مصنوعی بهبود بخشید
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Panel */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  آپلود تصویر
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-green-500 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-300 mb-2">تصویر خود را اینجا بکشید</p>
                    <p className="text-gray-500 text-sm">یا کلیک کنید تا انتخاب کنید</p>
                  </label>
                </div>

                <div>
                  <h4 className="text-white font-semibold mb-3">روش‌های بهبود:</h4>
                  <div className="space-y-2">
                    {enhanceOptions.map((option, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-green-600 bg-gray-600 border-gray-500 rounded"
                          defaultChecked={index === 0}
                        />
                        <div>
                          <p className="text-white text-sm font-medium">{option.name}</p>
                          <p className="text-gray-400 text-xs">{option.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleEnhance}
                  disabled={!uploadedImage || isProcessing}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                      در حال پردازش...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 ml-2" />
                      بهبود تصویر
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
                  <Image className="w-5 h-5" />
                  نتیجه بهبود
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Original Image */}
                  <div>
                    <h4 className="text-white font-medium mb-3">تصویر اصلی</h4>
                    <div className="bg-gray-700 rounded-lg h-64 flex items-center justify-center">
                      {uploadedImage ? (
                        <img 
                          src={uploadedImage} 
                          alt="Original" 
                          className="max-w-full max-h-full object-contain rounded-lg"
                        />
                      ) : (
                        <div className="text-center text-gray-400">
                          <Image className="w-12 h-12 mx-auto mb-2" />
                          <p>تصویر آپلود نشده</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Enhanced Image */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-white font-medium">تصویر بهبود یافته</h4>
                      {!isProcessing && uploadedImage && (
                        <Button size="sm" variant="outline" className="border-gray-600 text-gray-300">
                          <Download className="w-4 h-4 ml-2" />
                          دانلود
                        </Button>
                      )}
                    </div>
                    <div className="bg-gray-700 rounded-lg h-64 flex items-center justify-center">
                      {isProcessing ? (
                        <div className="text-center">
                          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                          <p className="text-gray-300">در حال بهبود تصویر...</p>
                        </div>
                      ) : uploadedImage ? (
                        <div className="text-center text-gray-400">
                          <Sparkles className="w-12 h-12 mx-auto mb-2" />
                          <p>تصویر بهبود یافته اینجا نمایش داده می‌شود</p>
                        </div>
                      ) : (
                        <div className="text-center text-gray-400">
                          <Image className="w-12 h-12 mx-auto mb-2" />
                          <p>ابتدا تصویری آپلود کنید</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="bg-gray-800 border-gray-700 mt-6">
              <CardHeader>
                <CardTitle className="text-white">راهنمای استفاده</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-white font-semibold mb-3">فرمت‌های پشتیبانی شده:</h4>
                    <ul className="space-y-1 text-gray-300">
                      <li>• JPEG, JPG</li>
                      <li>• PNG</li>
                      <li>• WebP</li>
                      <li>• حداکثر حجم: 10MB</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-3">قابلیت‌ها:</h4>
                    <ul className="space-y-1 text-gray-300">
                      <li>• افزایش رزولوشن تا 4 برابر</li>
                      <li>• حذف نویز و بهبود وضوح</li>
                      <li>• رنگ‌آمیزی هوشمند</li>
                      <li>• بازسازی جزئیات چهره</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Enhance;
