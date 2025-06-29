
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
        toast({
          title: 'موفق',
          description: 'کد تأیید به شماره شما ارسال شد'
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
      
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/phone-auth`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`,
        },
        body: JSON.stringify({ 
          phone_number: phoneNumber,
          otp_code: otpCode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Error verifying OTP:', data);
        toast({
          title: 'خطا در تأیید کد',
          description: data.error || 'کد تأیید نامعتبر است',
          variant: "destructive"
        });
      } else {
        console.log('OTP verified successfully:', data);
        
        if (data.auth_url) {
          // Redirect to auth URL to establish session
          window.location.href = data.auth_url;
        } else {
          toast({
            title: 'موفق',
            description: data.user_exists ? 'ورود موفقیت‌آمیز' : 'ثبت‌نام و ورود موفقیت‌آمیز'
          });
          navigate('/');
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
    handleVerifyOtp
  };
};
