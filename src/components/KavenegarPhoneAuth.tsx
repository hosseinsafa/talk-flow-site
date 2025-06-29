
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useKavenegarAuth } from '@/hooks/useKavenegarAuth';
import { PhoneNumberStep } from './auth/PhoneNumberStep';
import { OtpVerificationStep } from './auth/OtpVerificationStep';

interface KavenegarPhoneAuthProps {
  onBack: () => void;
}

const KavenegarPhoneAuth = ({ onBack }: KavenegarPhoneAuthProps) => {
  const {
    step,
    setStep,
    phoneNumber,
    setPhoneNumber,
    otpCode,
    setOtpCode,
    loading,
    handleSendOtp,
    handleVerifyOtp
  } = useKavenegarAuth();

  const getStepTitle = () => {
    switch (step) {
      case 'phone': return 'ورود با شماره موبایل';
      case 'otp': return 'تأیید کد';
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 'phone':
        return (
          <PhoneNumberStep
            phoneNumber={phoneNumber}
            setPhoneNumber={setPhoneNumber}
            onSubmit={handleSendOtp}
            loading={loading}
            onBack={onBack}
          />
        );
      case 'otp':
        return (
          <OtpVerificationStep
            phoneNumber={phoneNumber}
            otpCode={otpCode}
            setOtpCode={setOtpCode}
            onSubmit={handleVerifyOtp}
            loading={loading}
            onChangePhone={() => setStep('phone')}
          />
        );
    }
  };

  return (
    <Card className="w-full max-w-md bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white text-center">
          {getStepTitle()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderStepContent()}
      </CardContent>
    </Card>
  );
};

export default KavenegarPhoneAuth;
