
import { useState } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { validateIranianPhone } from '@/utils/phoneValidation';
import { useNavigate } from 'react-router-dom';

export const usePhoneAuth = () => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { sendPhoneOtp, verifyPhoneOtp } = useAuth();
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

    // Convert Iranian phone format to international format
    const internationalPhone = phoneNumber.replace(/^0/, '+98');

    const { error } = await sendPhoneOtp(internationalPhone);
    
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

    // Convert Iranian phone format to international format
    const internationalPhone = phoneNumber.replace(/^0/, '+98');

    const { error } = await verifyPhoneOtp(internationalPhone, otpCode);
    
    if (error) {
      toast({
        title: 'خطا در تأیید کد',
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: 'موفق',
        description: 'ورود موفقیت‌آمیز'
      });
      
      // Redirect to main page after successful authentication
      setTimeout(() => {
        navigate('/');
      }, 1500);
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
