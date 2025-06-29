
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { t } from '@/lib/localization';

interface PhoneAuthProps {
  onBack: () => void;
}

const PhoneAuth = ({ onBack }: PhoneAuthProps) => {
  const [step, setStep] = useState<'phone' | 'otp' | 'complete'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [userExists, setUserExists] = useState(false);
  
  const { sendOtp, verifyOtp, completePhoneSignUp } = useAuth();
  const { toast } = useToast();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate Iranian phone number
    const iranPhoneRegex = /^(\+98|0098|98|0)?9[0-9]{9}$/;
    if (!iranPhoneRegex.test(phoneNumber)) {
      toast({
        title: 'خطا',
        description: 'لطفاً شماره موبایل معتبر وارد کنید (09xxxxxxxxx)',
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    const { error } = await sendOtp(phoneNumber);
    
    if (error) {
      toast({
        title: 'خطا در ارسال کد',
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: 'موفق',
        description: 'کد تأیید به شماره شما ارسال شد'
      });
      setStep('otp');
    }
    
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      toast({
        title: 'خطا',
        description: 'لطفاً کد ۶ رقمی را کامل وارد کنید',
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    const { error, data } = await verifyOtp(phoneNumber, otpCode);
    
    if (error) {
      toast({
        title: 'خطا در تأیید کد',
        description: error.message,
        variant: "destructive"
      });
    } else if (data) {
      if (data.user_exists) {
        // User exists, they should be automatically logged in
        toast({
          title: 'موفق',
          description: 'ورود موفقیت‌آمیز'
        });
        // The auth state will be updated automatically
      } else {
        // New user, need to complete registration
        setUserExists(false);
        setStep('complete');
      }
    }
    
    setLoading(false);
  };

  const handleCompleteSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast({
        title: 'خطا',
        description: 'لطفاً نام خود را وارد کنید',
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    const { error } = await completePhoneSignUp(phoneNumber, fullName, email);
    
    if (error) {
      toast({
        title: 'خطا در ایجاد حساب',
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: 'موفق',
        description: 'حساب شما با موفقیت ایجاد شد'
      });
    }
    
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white text-center">
          {step === 'phone' && 'ورود با شماره موبایل'}
          {step === 'otp' && 'تأیید کد'}
          {step === 'complete' && 'تکمیل اطلاعات'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <Label htmlFor="phone" className="text-gray-300">شماره موبایل</Label>
              <Input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="09123456789"
                required
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                dir="ltr"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'در حال ارسال...' : 'ارسال کد تأیید'}
            </Button>
            <Button 
              type="button" 
              variant="ghost"
              className="w-full text-gray-400 hover:text-white"
              onClick={onBack}
            >
              بازگشت
            </Button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center">
              <p className="text-gray-300 mb-4">
                کد تأیید به شماره {phoneNumber} ارسال شد
              </p>
              <div className="flex justify-center">
                <InputOTP value={otpCode} onChange={setOtpCode} maxLength={6}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="bg-gray-700 border-gray-600 text-white" />
                    <InputOTPSlot index={1} className="bg-gray-700 border-gray-600 text-white" />
                    <InputOTPSlot index={2} className="bg-gray-700 border-gray-600 text-white" />
                    <InputOTPSlot index={3} className="bg-gray-700 border-gray-600 text-white" />
                    <InputOTPSlot index={4} className="bg-gray-700 border-gray-600 text-white" />
                    <InputOTPSlot index={5} className="bg-gray-700 border-gray-600 text-white" />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'در حال تأیید...' : 'تأیید کد'}
            </Button>
            <Button 
              type="button" 
              variant="ghost"
              className="w-full text-gray-400 hover:text-white"
              onClick={() => setStep('phone')}
            >
              تغییر شماره
            </Button>
          </form>
        )}

        {step === 'complete' && (
          <form onSubmit={handleCompleteSignUp} className="space-y-4">
            <div>
              <Label htmlFor="fullname" className="text-gray-300">نام کامل *</Label>
              <Input
                id="fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                placeholder="نام و نام خانوادگی"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-gray-300">ایمیل (اختیاری)</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                placeholder="your@email.com"
                dir="ltr"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'در حال ایجاد حساب...' : 'ایجاد حساب'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default PhoneAuth;
