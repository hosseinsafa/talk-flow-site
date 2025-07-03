
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  Image as ImageIcon, 
  Video, 
  Zap,
  ArrowRight,
  Sparkles
} from 'lucide-react';

const Index = () => {
  const features = [
    {
      title: 'چت هوشمند',
      description: 'با هوش مصنوعی پیشرفته گفتگو کنید',
      icon: MessageSquare,
      path: '/chat',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'تولید تصویر',
      description: 'تصاویر خلاقانه با هوش مصنوعی بسازید',
      icon: ImageIcon,
      path: '/image',
      color: 'from-purple-500 to-pink-500'
    },
    {
      title: 'تولید ویدیو',
      description: 'ویدیوهای شگفت‌انگیز تولید کنید',
      icon: Video,
      path: '/video-generation',
      color: 'from-red-500 to-orange-500'
    },
    {
      title: 'بهبود کیفیت',
      description: 'کیفیت تصاویر خود را افزایش دهید',
      icon: Zap,
      path: '/enhance',
      color: 'from-green-500 to-emerald-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Hero Section */}
        <div className="text-center py-20">
          <div className="flex items-center justify-center mb-6">
            <Sparkles className="w-12 h-12 text-yellow-400 mr-4" />
            <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Krea AI
            </h1>
          </div>
          
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            پلتفرم جامع هوش مصنوعی برای تولید محتوای خلاقانه
            <br />
            از چت هوشمند تا تولید تصویر و ویدیو
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/chat">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg">
                شروع چت
                <ArrowRight className="w-5 h-5 mr-2" />
              </Button>
            </Link>
            
            <Link to="/image">
              <Button size="lg" variant="outline" className="border-gray-600 text-white hover:bg-gray-800 px-8 py-4 text-lg">
                تولید تصویر
                <ImageIcon className="w-5 h-5 mr-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="py-20">
          <h2 className="text-4xl font-bold text-center mb-16">
            قابلیت‌های پلتفرم
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Link key={index} to={feature.path}>
                <div className="group relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all duration-300 hover:scale-105 cursor-pointer">
                  <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-xl" 
                       style={{background: `linear-gradient(135deg, ${feature.color.split(' ')[1]}, ${feature.color.split(' ')[3]})`}} />
                  
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-2 text-white">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                  
                  <div className="mt-4 flex items-center text-blue-400 text-sm group-hover:text-blue-300 transition-colors">
                    شروع کنید
                    <ArrowRight className="w-4 h-4 mr-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center py-20 border-t border-gray-800">
          <h2 className="text-3xl font-bold mb-4">
            آماده شروع هستید؟
          </h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            همین الان با ابزارهای هوش مصنوعی ما شروع کنید و تجربه‌ای متفاوت داشته باشید
          </p>
          
          <Link to="/auth">
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg">
              ثبت نام رایگان
              <Sparkles className="w-5 h-5 mr-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;
