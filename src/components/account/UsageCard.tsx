
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import { t } from '@/lib/localization';

interface UserUsage {
  chat_messages_count: number;
  images_generated_count: number;
  last_reset_date: string;
}

interface UserPlan {
  plan_type: string;
}

interface UsageCardProps {
  usage: UserUsage | null;
  plan: UserPlan | null;
}

const UsageCard = ({ usage, plan }: UsageCardProps) => {
  const planLimits = {
    free: { messages: 50, images: 5 },
    pro: { messages: 1000, images: 100 }
  };

  const currentLimits = planLimits[plan?.plan_type as keyof typeof planLimits] || planLimits.free;

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          {t.account.usageStats}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-300">{t.account.chatMessages}</span>
              <span className="text-white font-medium">
                {usage?.chat_messages_count || 0} / {currentLimits.messages}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(((usage?.chat_messages_count || 0) / currentLimits.messages) * 100, 100)}%` 
                }}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-300">{t.account.imagesGenerated}</span>
              <span className="text-white font-medium">
                {usage?.images_generated_count || 0} / {currentLimits.images}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(((usage?.images_generated_count || 0) / currentLimits.images) * 100, 100)}%` 
                }}
              ></div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-400">
            {t.account.usageResets} {new Date(usage?.last_reset_date || '').toLocaleDateString('fa-IR')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default UsageCard;
