
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PhoneNumberStepProps {
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  loading: boolean;
  onBack: () => void;
}

export const PhoneNumberStep = ({ 
  phoneNumber, 
  setPhoneNumber, 
  onSubmit, 
  loading, 
  onBack 
}: PhoneNumberStepProps) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="phone" className="text-gray-300">شماره موبایل</Label>
        <Input
          id="phone"
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="09123456789"
          required
          className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
          dir="ltr"
        />
      </div>
      <Button 
        type="submit" 
        className="w-full bg-blue-600 hover:bg-blue-700"
        disabled={loading}
      >
        {loading ? 'در حال ارسال...' : 'ارسال کد تأیید'}
      </Button>
      <Button 
        type="button" 
        variant="ghost"
        className="w-full text-gray-400 hover:text-white"
        onClick={onBack}
      >
        بازگشت
      </Button>
    </form>
  );
};
