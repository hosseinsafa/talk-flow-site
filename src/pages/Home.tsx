
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Image, 
  Video, 
  Zap, 
  Sparkles, 
  ArrowLeft,
  Play,
  Palette,
  Bot
} from 'lucide-react';

const Home = () => {
  const services = [
    {
      title: 'چت هوشمند',
      description: 'گفتگو با هوش مصنوعی پیشرفته برای پاسخ به سوالات و کمک در کارها',
      icon: MessageSquare,
      path: '/chat',
      color: 'from-blue-500 to-cyan-500',
      features: ['پاسخ فوری', 'چندزبانه', 'حافظه مکالمه'],
      badge: 'فعال'
    },
    {
      title: 'تولید تصویر',
      description: 'ایجاد تصاویر هنری و حرفه‌ای با کیفیت بالا از روی توضیحات متنی',
      icon: Image,
      path: '/image',
      color: 'from-purple-500 to-pink-500',
      features: ['کیفیت 4K', 'استایل‌های مختلف', 'سفارشی‌سازی کامل'],
      badge: 'جدید'
    },
    {
      title: 'تولید ویدیو',
      description: 'ساخت ویدیوهای کوتاه و انیمیشن از روی تصاویر و متن',
      icon: Video,
      path: '/video',
      color: 'from-red-500 to-orange-500',
      features: ['HD کیفیت', 'انیمیشن هوشمند', 'صدا و موسیقی'],
      badge: 'بزودی'
    },
    {
      title: 'بهبود کیفیت',
      description: 'افزایش کیفیت تصاویر و ویدیوها با استفاده از هوش مصنوعی',
      icon: Zap,
      path: '/enhance',
      color: 'from-green-500 to-emerald-500',
      features: ['Super Resolution', 'حذف نویز', 'رنگ‌آمیزی خودکار'],
      badge: 'محبوب'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <Badge className="mb-4 bg-blue-600 text-white">
              <Sparkles className="w-4 h-4 ml-2" />
              قدرت هوش مصنوعی
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              خلاقیت بی‌پایان
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                با هوش مصنوعی
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              پلتفرم جامع هوش مصنوعی برای تولید محتوا، چت هوشمند، ایجاد تصاویر و ویدیوهای حرفه‌ای
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3">
                  <Bot className="w-5 h-5 ml-2" />
                  شروع رایگان
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-gray-600 text-gray-300 hover:text-white text-lg px-8 py-3">
                <Play className="w-5 h-5 ml-2" />
                مشاهده نمونه‌ها
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              خدمات هوش مصنوعی
            </h2>
            <p className="text-xl text-gray-400">
              ابزارهای قدرتمند برای تحقق ایده‌های شما
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {services.map((service, index) => (
              <Card key={index} className="bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-all duration-300 hover:transform hover:scale-105">
                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${service.color} flex items-center justify-center`}>
                      <service.icon className="w-6 h-6 text-white" />
                    </div>
                    <Badge 
                      variant={service.badge === 'بزودی' ? 'secondary' : 'default'}
                      className={
                        service.badge === 'جدید' ? 'bg-green-600' :
                        service.badge === 'محبوب' ? 'bg-orange-600' :
                        service.badge === 'بزودی' ? 'bg-gray-600' : 'bg-blue-600'
                      }
                    >
                      {service.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-white text-2xl mb-2">
                    {service.title}
                  </CardTitle>
                  <p className="text-gray-400">
                    {service.description}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <h4 className="text-white font-semibold mb-3">ویژگی‌ها:</h4>
                    <ul className="space-y-2">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center text-gray-300">
                          <div className="w-2 h-2 bg-blue-500 rounded-full ml-3"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link to={service.path}>
                    <Button 
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      disabled={service.badge === 'بزودی'}
                    >
                      <ArrowLeft className="w-4 h-4 ml-2" />
                      {service.badge === 'بزودی' ? 'بزودی دردسترس' : 'شروع کنید'}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              چرا Krea AI؟
            </h2>
            <p className="text-xl text-gray-400">
              بهترین تجربه هوش مصنوعی با کیفیت بالا
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">کیفیت بالا</h3>
              <p className="text-gray-400">
                تولید محتوای باکیفیت و حرفه‌ای با استفاده از جدیدترین مدل‌های هوش مصنوعی
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">سرعت بالا</h3>
              <p className="text-gray-400">
                پردازش سریع و دریافت نتایج در کمترین زمان ممکن
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Palette className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">سفارشی‌سازی</h3>
              <p className="text-gray-400">
                کنترل کامل بر تولید محتوا با امکانات سفارشی‌سازی گسترده
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
