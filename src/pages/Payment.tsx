
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Check, ArrowLeft } from 'lucide-react';

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
        title: "Payment Successful!",
        description: "Your plan has been upgraded to Pro. Redirecting to account page...",
      });
      
      setTimeout(() => {
        navigate('/account');
      }, 2000);
      
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: "There was an error processing your payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      name: 'Free',
      price: '0',
      currency: 'تومان',
      period: 'month',
      features: [
        '50 chat messages per month',
        '5 image generations per month',
        'Basic AI models',
        'Standard support'
      ],
      current: true
    },
    {
      name: 'Pro',
      price: '99,000',
      currency: 'تومان',
      period: 'month',
      features: [
        '1,000 chat messages per month',
        '100 image generations per month',
        'Premium AI models (GPT-4o)',
        'Priority support',
        'Advanced image quality',
        'No ads'
      ],
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
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Account
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Choose Your Plan</h1>
            <p className="text-gray-400">Upgrade to unlock premium features</p>
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
                  Most Popular
                </Badge>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="text-white text-2xl">{plan.name}</CardTitle>
                <div className="text-3xl font-bold text-white mt-2">
                  {plan.price}
                  <span className="text-lg font-normal text-gray-400 ml-1">
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
                    Current Plan
                  </Button>
                ) : (
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => handlePayment('pro')}
                    disabled={loading}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {loading ? 'Processing...' : 'Upgrade Now'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Payment Info */}
        <Card className="mt-8 bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Payment Information</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-300">
            <div className="space-y-3">
              <p>✅ Secure payment processing</p>
              <p>✅ 30-day money-back guarantee</p>
              <p>✅ Cancel anytime</p>
              <p>✅ Instant activation</p>
            </div>
            <div className="mt-4 p-4 bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-400">
                <strong>Note:</strong> This is a demo payment system. In production, this would integrate 
                with Pay.ir or Zarinpal for secure payment processing.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Payment;
