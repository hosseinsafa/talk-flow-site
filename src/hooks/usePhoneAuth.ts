
import { useState } from 'react';
import { useToast } from './use-toast';
import { validateIranianPhone, formatPhoneToE164 } from '@/utils/phoneValidation';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export const usePhoneAuth = () => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [mockOtp, setMockOtp] = useState<string>('123456');
  
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!validateIranianPhone(phoneNumber)) {
      toast({
        title: 'خطا',
        description: 'لطفاً شماره موبایل معتبر وارد کنید (09xxxxxxxxx)',
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    try {
      console.log('Sending OTP for phone:', phoneNumber);
      
      // For now, we'll just show the mock OTP and move to verification step
      // In a real implementation, you would call an Edge Function to send SMS
      setMockOtp('123456');
      console.log('=== TEST OTP CODE: 123456 ===');
      
      toast({
        title: 'موفق',
        description: 'کد تأیید: 123456 (حالت تست)',
        duration: 10000
      });
      setStep('otp');
    } catch (err) {
      console.error('Error in OTP flow:', err);
      toast({
        title: 'خطا در ارسال کد',
        description: 'خطا در برقراری ارتباط با سرور',
        variant: "destructive"
      });
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

    try {
      // Format phone number to E.164 before sending to Supabase
      const formattedPhone = formatPhoneToE164(phoneNumber);
      console.log('Original phone:', phoneNumber);
      console.log('Formatted phone (E.164):', formattedPhone);
      console.log('Verifying OTP with code:', otpCode);
      
      const { data, error } = await supabase.functions.invoke('phone-auth', {
        body: { 
          phone: formattedPhone,
          code: otpCode
        }
      });

      console.log('Phone auth response:', { data, error });

      if (error) {
        console.error('Error verifying OTP:', error);
        toast({
          title: 'خطا در تأیید کد',
          description: error.message || 'کد تأیید نامعتبر است',
          variant: "destructive"
        });
      } else if (data?.session) {
        console.log('OTP verified successfully, setting session:', data.session);
        
        // Set the session in Supabase
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });

        if (sessionError) {
          console.error('Error setting session:', sessionError);
          toast({
            title: 'خطا در ایجاد جلسه',
            description: 'خطا در ایجاد جلسه کاربری',
            variant: "destructive"
          });
        } else {
          console.log('Session set successfully');
          toast({
            title: 'موفق',
            description: 'ورود موفقیت‌آمیز'
          });
          navigate('/');
        }
      } else {
        toast({
          title: 'خطا',
          description: 'پاسخ نامعتبر از سرور',
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error('Network error:', err);
      toast({
        title: 'خطا در تأیید کد',
        description: 'خطا در برقراری ارتباط با سرور',
        variant: "destructive"
      });
    }
    
    setLoading(false);
  };

  return {
    step,
    setStep,
    phoneNumber,
    setPhoneNumber,
    otpCode,
    setOtpCode,
    loading,
    handleSendOtp,
    handleVerifyOtp,
    mockOtp
  };
};
