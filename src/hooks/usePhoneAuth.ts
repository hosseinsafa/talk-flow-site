
import { useState } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { validateIranianPhone } from '@/utils/phoneValidation';

export const usePhoneAuth = () => {
  const [step, setStep] = useState<'phone' | 'otp' | 'complete'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { sendOtp, verifyOtp, completePhoneSignUp } = useAuth();
  const { toast } = useToast();

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
        toast({
          title: 'موفق',
          description: 'ورود موفقیت‌آمیز'
        });
      } else {
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

  return {
    step,
    setStep,
    phoneNumber,
    setPhoneNumber,
    otpCode,
    setOtpCode,
    fullName,
    setFullName,
    email,
    setEmail,
    loading,
    handleSendOtp,
    handleVerifyOtp,
    handleCompleteSignUp
  };
};
