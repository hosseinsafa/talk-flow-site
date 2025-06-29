
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Check, ArrowRight } from 'lucide-react';
import { t } from '@/lib/localization';

const Payment = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const handlePayment = async (planType: 'pro') => {
    setLoading(true);
    
    try {
      // Here you would integrate with Pay.ir or Zarinpal
      // For now, we'll simulate a successful payment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: t.payment.paymentSuccessful,
        description: t.payment.planUpgraded,
      });
      
      setTimeout(() => {
        navigate('/account');
      }, 2000);
      
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: t.payment.paymentFailed,
        description: t.payment.paymentError,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      name: t.account.freePlan,
      price: '0',
      currency: t.payment.toman,
      period: t.payment.month,
      features: t.payment.features.free,
      current: true
    },
    {
      name: t.account.proPlan,
      price: '99,000',
      currency: t.payment.toman,
      period: t.payment.month,
      features: t.payment.features.pro,
      popular: true
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            onClick={() => navigate('/account')} 
            variant="ghost" 
            className="text-gray-400 hover:text-white"
          >
            <ArrowRight className="w-4 h-4 ml-2" />
            {t.payment.backToAccount}
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">{t.payment.title}</h1>
            <p className="text-gray-400">{t.payment.subtitle}</p>
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.map((plan, index) => (
            <Card 
              key={plan.name} 
              className={`bg-gray-800 border-gray-700 relative ${
                plan.popular ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-blue-600">
                  {t.payment.mostPopular}
                </Badge>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="text-white text-2xl">{plan.name}</CardTitle>
                <div className="text-3xl font-bold text-white mt-2">
                  {plan.price}
                  <span className="text-lg font-normal text-gray-400 mr-1">
                    {plan.currency}/{plan.period}
                  </span>
                </div>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-2 text-gray-300">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                {plan.current ? (
                  <Button 
                    className="w-full border-gray-600 text-gray-400" 
                    variant="outline" 
                    disabled
                  >
                    {t.payment.currentPlan}
                  </Button>
                ) : (
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => handlePayment('pro')}
                    disabled={loading}
                  >
                    <CreditCard className="w-4 h-4 ml-2" />
                    {loading ? t.payment.processing : t.payment.upgradeNow}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Payment Info */}
        <Card className="mt-8 bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">{t.payment.paymentInfo}</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-300">
            <div className="space-y-3">
              <p>✅ {t.payment.securePayment}</p>
              <p>✅ {t.payment.moneyBack}</p>
              <p>✅ {t.payment.cancelAnytime}</p>
              <p>✅ {t.payment.instantActivation}</p>
            </div>
            <div className="mt-4 p-4 bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-400">
                <strong>توجه:</strong> {t.payment.demoNote}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Payment;
