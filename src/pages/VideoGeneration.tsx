
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Video, Clock, Play, Download, Upload } from 'lucide-react';

const VideoGeneration = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center">
              <Video className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">تولید ویدیو هوشمند</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            ویدیوهای کوتاه و انیمیشن حرفه‌ای از روی تصاویر و متن ایجاد کنید
          </p>
          <Badge className="mt-4 bg-orange-600">
            <Clock className="w-4 h-4 ml-2" />
            بزودی دردسترس
          </Badge>
        </div>

        {/* Coming Soon Content */}
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-center">ویژگی‌های آینده</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Play className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-2">تولید ویدیو از متن</h3>
                      <p className="text-gray-400">ایجاد ویدیوهای کوتاه از روی توضیحات متنی</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Upload className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-2">انیمیشن تصاویر</h3>
                      <p className="text-gray-400">تبدیل تصاویر ثابت به انیمیشن‌های زنده</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Video className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-2">کیفیت HD</h3>
                      <p className="text-gray-400">تولید ویدیو با کیفیت 1080p و بالاتر</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-2">کنترل زمان</h3>
                      <p className="text-gray-400">تنظیم مدت زمان ویدیو از 3 تا 30 ثانیه</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Download className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-2">فرمت‌های مختلف</h3>
                      <p className="text-gray-400">دانلود در فرمت‌های MP4، GIF و WebM</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Play className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-2">صدا و موسیقی</h3>
                      <p className="text-gray-400">افزودن موسیقی پس‌زمینه و جلوه‌های صوتی</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Card */}
          <Card className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/20 mt-8">
            <CardContent className="pt-6">
              <div className="text-center">
                <h3 className="text-white font-semibold mb-2">اطلاع‌رسانی راه‌اندازی</h3>
                <p className="text-gray-300 mb-4">
                  برای اطلاع از زمان راه‌اندازی این قابلیت، ایمیل خود را وارد کنید
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                  <input
                    type="email"
                    placeholder="آدرس ایمیل شما"
                    className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400"
                  />
                  <Button className="bg-red-600 hover:bg-red-700">
                    اطلاع‌رسانی
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VideoGeneration;
