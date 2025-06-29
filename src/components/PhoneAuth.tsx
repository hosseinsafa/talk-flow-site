
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePhoneAuth } from '@/hooks/usePhoneAuth';
import { PhoneNumberStep } from './auth/PhoneNumberStep';
import { OtpVerificationStep } from './auth/OtpVerificationStep';
import { ProfileCompletionStep } from './auth/ProfileCompletionStep';

interface PhoneAuthProps {
  onBack: () => void;
}

const PhoneAuth = ({ onBack }: PhoneAuthProps) => {
  const {
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
  } = usePhoneAuth();

  const getStepTitle = () => {
    switch (step) {
      case 'phone': return 'ورود با شماره موبایل';
      case 'otp': return 'تأیید کد';
      case 'complete': return 'تکمیل اطلاعات';
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
      case 'complete':
        return (
          <ProfileCompletionStep
            fullName={fullName}
            setFullName={setFullName}
            email={email}
            setEmail={setEmail}
            onSubmit={handleCompleteSignUp}
            loading={loading}
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

export default PhoneAuth;
