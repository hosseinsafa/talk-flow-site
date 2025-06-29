
import React from 'react';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface OtpVerificationStepProps {
  phoneNumber: string;
  otpCode: string;
  setOtpCode: (value: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  loading: boolean;
  onChangePhone: () => void;
  mockOtp?: string;
}

export const OtpVerificationStep = ({
  phoneNumber,
  otpCode,
  setOtpCode,
  onSubmit,
  loading,
  onChangePhone,
  mockOtp
}: OtpVerificationStepProps) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="text-center">
        <p className="text-gray-300 mb-4">
          کد تأیید به شماره {phoneNumber} ارسال شد
        </p>
        {mockOtp && (
          <div className="bg-yellow-800 border border-yellow-600 rounded p-3 mb-4">
            <p className="text-yellow-200 text-sm font-bold">
              حالت تست - کد OTP: {mockOtp}
            </p>
          </div>
        )}
        <div className="flex justify-center" dir="ltr">
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
        onClick={onChangePhone}
      >
        تغییر شماره
      </Button>
    </form>
  );
};
