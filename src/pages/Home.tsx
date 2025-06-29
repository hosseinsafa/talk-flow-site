
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  MessageSquare, 
  Image, 
  Video, 
  Zap
} from 'lucide-react';

const Home = () => {
  const services = [
    {
      title: 'ChatGPT',
      description: 'The most powerful image generator ever. Try now in Krea Image, Krea Chat, and Krea Stage.',
      icon: MessageSquare,
      path: '/chat',
      gradient: 'from-purple-400 via-pink-400 to-orange-300',
      label: 'NEW MODEL',
      buttonText: 'Generate with ChatGPT',
      backgroundImage: '/placeholder.svg'
    },
    {
      title: 'image',
      description: 'Our first frontier image model. State of the art photorealism. High quality, diversity excellent prompt adherence. Apply now for beta access.',
      icon: Image,
      path: '/image',
      gradient: 'from-blue-500 via-teal-500 to-green-400',
      label: 'NEW MODEL',
      buttonText: 'Read more',
      backgroundImage: '/placeholder.svg'
    },
    {
      title: 'video',
      description: 'Editing images has never been easier. Try FLUX Kontrol to change generations and photos.',
      icon: Video,
      path: '/video',
      gradient: 'from-pink-400 via-purple-400 to-indigo-400',
      label: '',
      buttonText: 'Read more',
      backgroundImage: '/placeholder.svg'
    },
    {
      title: 'enhance',
      description: 'AI-powered image enhancement and upscaling for professional quality results.',
      icon: Zap,
      path: '/enhance',
      gradient: 'from-green-400 via-emerald-400 to-teal-400',
      label: '',
      buttonText: 'Try enhance',
      backgroundImage: '/placeholder.svg'
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-light text-white mb-6 leading-tight">
            پلتفرم جامع هوش مصنوعی برای تولید محتوا، ایجاد تصاویر و ویدیوهای حرفه‌ای
          </h1>
        </div>
      </section>

      {/* Services Grid */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <Card 
                key={index} 
                className={`relative overflow-hidden border-0 bg-gradient-to-br ${service.gradient} h-80 group cursor-pointer hover:scale-105 transition-transform duration-300`}
              >
                <div className="absolute inset-0 bg-black/20"></div>
                
                {/* Background Image Placeholder */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                  <service.icon className="w-32 h-32 text-white" />
                </div>

                <CardContent className="relative h-full p-6 flex flex-col justify-between">
                  {/* Label */}
                  {service.label && (
                    <div className="self-start">
                      <span className="text-xs font-medium text-white/90 bg-white/20 px-2 py-1 rounded-full">
                        {service.label}
                      </span>
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 flex flex-col justify-center">
                    <h2 className="text-4xl font-bold text-white mb-4">
                      {service.title}
                    </h2>
                    <p className="text-white/90 text-sm leading-relaxed mb-6">
                      {service.description}
                    </p>
                  </div>

                  {/* Button */}
                  <div className="self-start">
                    <Link to={service.path}>
                      <Button 
                        variant="outline" 
                        className="bg-white/20 border-white/30 text-white hover:bg-white hover:text-black transition-all duration-300"
                      >
                        {service.buttonText}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-semibold text-white mb-4">
            خدمات هوش مصنوعی
          </h2>
          <p className="text-gray-400 mb-8">
            ابزارهای قدرتمند برای تحقق ایده‌های شما
          </p>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3">
            شروع رایگان
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Home;
