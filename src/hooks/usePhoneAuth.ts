
import { useState } from 'react';
import { useToast } from './use-toast';
import { validateIranianPhone } from '@/utils/phoneValidation';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export const usePhoneAuth = () => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [mockOtp, setMockOtp] = useState<string>('');
  
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
      console.log('Sending OTP via phone-auth function for phone:', phoneNumber);
      
      const { data, error } = await supabase.functions.invoke('phone-auth', {
        body: { phone_number: phoneNumber }
      });

      if (error) {
        console.error('Error sending OTP:', error);
        toast({
          title: 'خطا در ارسال کد',
          description: error.message || 'خطا در ارسال کد تأیید',
          variant: "destructive"
        });
      } else {
        console.log('OTP sent successfully:', data);
        if (data.mock_otp) {
          setMockOtp(data.mock_otp);
          console.log('=== TEST OTP CODE:', data.mock_otp, '===');
        }
        toast({
          title: 'موفق',
          description: `کد تأیید: ${data.mock_otp || 'ارسال شد'} (حالت تست)`,
          duration: 10000
        });
        setStep('otp');
      }
    } catch (err) {
      console.error('Network error:', err);
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
      console.log('Verifying OTP via phone-auth function for phone:', phoneNumber, 'with code:', otpCode);
      
      const { data, error } = await supabase.functions.invoke('phone-auth', {
        body: { 
          phone_number: phoneNumber,
          otp_code: otpCode
        }
      });

      if (error) {
        console.error('Error verifying OTP:', error);
        toast({
          title: 'خطا در تأیید کد',
          description: error.message || 'کد تأیید نامعتبر است',
          variant: "destructive"
        });
      } else {
        console.log('OTP verified successfully:', data);
        
        if (data.access_token && data.refresh_token) {
          // Set the session in Supabase
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token
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
              description: data.user_exists ? 'ورود موفقیت‌آمیز' : 'ثبت‌نام و ورود موفقیت‌آمیز'
            });
            navigate('/');
          }
        } else {
          toast({
            title: 'خطا',
            description: 'دریافت اطلاعات جلسه ناموفق',
            variant: "destructive"
          });
        }
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
