
import { useState } from 'react';
import { useToast } from './use-toast';
import { validateIranianPhone } from '@/utils/phoneValidation';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  phone_number: string;
  full_name?: string;
}

export const useKavenegarAuth = () => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load user from localStorage on hook initialization
  useState(() => {
    const token = localStorage.getItem('phone_auth_token');
    const userData = localStorage.getItem('phone_auth_user');
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error('Error parsing user data:', e);
        localStorage.removeItem('phone_auth_token');
        localStorage.removeItem('phone_auth_user');
      }
    }
  });

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
      
      const { data, error } = await supabase.functions.invoke('send-phone-otp', {
        body: { phone_number: phoneNumber }
      });

      if (error) {
        console.error('Error sending OTP:', error);
        toast({
          title: 'خطا در ارسال کد',
          description: 'خطا در ارسال کد تأیید',
          variant: "destructive"
        });
      } else if (data?.error) {
        toast({
          title: 'خطا',
          description: data.error,
          variant: "destructive"
        });
      } else {
        console.log('OTP sent successfully');
        
        // Show development OTP if available
        if (data?.dev_otp) {
          toast({
            title: 'موفق',
            description: `کد تأیید: ${data.dev_otp} (حالت توسعه)`,
            duration: 10000
          });
        } else {
          toast({
            title: 'موفق',
            description: 'کد تأیید ارسال شد'
          });
        }
        
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
      console.log('Verifying OTP for phone:', phoneNumber, 'with code:', otpCode);
      
      const { data, error } = await supabase.functions.invoke('verify-phone-otp', {
        body: { 
          phone_number: phoneNumber,
          otp_code: otpCode
        }
      });

      console.log('OTP verification response:', { data, error });

      if (error) {
        console.error('Error verifying OTP:', error);
        toast({
          title: 'خطا در تأیید کد',
          description: 'خطا در تأیید کد',
          variant: "destructive"
        });
      } else if (data?.error) {
        toast({
          title: 'خطا',
          description: data.error,
          variant: "destructive"
        });
      } else if (data?.success && data?.token) {
        console.log('OTP verified successfully');
        
        // Store token and user data
        localStorage.setItem('phone_auth_token', data.token);
        localStorage.setItem('phone_auth_user', JSON.stringify(data.user));
        setUser(data.user);
        
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

  const logout = () => {
    localStorage.removeItem('phone_auth_token');
    localStorage.removeItem('phone_auth_user');
    setUser(null);
    navigate('/auth');
  };

  const isAuthenticated = () => {
    return !!user && !!localStorage.getItem('phone_auth_token');
  };

  return {
    step,
    setStep,
    phoneNumber,
    setPhoneNumber,
    otpCode,
    setOtpCode,
    loading,
    user,
    handleSendOtp,
    handleVerifyOtp,
    logout,
    isAuthenticated
  };
};
