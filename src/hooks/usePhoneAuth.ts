
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
      // Format phone number to E.164 before sending to Supabase
      const formattedPhone = formatPhoneToE164(phoneNumber);
      console.log('Sending OTP for phone:', formattedPhone);
      
      // Use Supabase's built-in signInWithOtp method
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone
      });

      if (error) {
        console.error('Error sending OTP:', error);
        toast({
          title: 'خطا در ارسال کد',
          description: error.message || 'خطا در ارسال کد تأیید',
          variant: "destructive"
        });
      } else {
        console.log('OTP sent successfully');
        // For testing purposes, show mock OTP
        setMockOtp('123456');
        console.log('=== TEST OTP CODE: 123456 ===');
        
        toast({
          title: 'موفق',
          description: 'کد تأیید: 123456 (حالت تست)',
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
      // Format phone number to E.164 before verifying
      const formattedPhone = formatPhoneToE164(phoneNumber);
      console.log('Verifying OTP for phone:', formattedPhone, 'with code:', otpCode);
      
      // Use Supabase's built-in verifyOtp method
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otpCode,
        type: 'sms'
      });

      console.log('OTP verification response:', { data, error });

      if (error) {
        console.error('Error verifying OTP:', error);
        toast({
          title: 'خطا در تأیید کد',
          description: error.message || 'کد تأیید نامعتبر است',
          variant: "destructive"
        });
      } else if (data?.session) {
        console.log('OTP verified successfully, session created:', data.session);
        toast({
          title: 'موفق',
          description: 'ورود موفقیت‌آمیز'
        });
        navigate('/');
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
