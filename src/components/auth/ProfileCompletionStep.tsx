
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ProfileCompletionStepProps {
  fullName: string;
  setFullName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  loading: boolean;
}

export const ProfileCompletionStep = ({
  fullName,
  setFullName,
  email,
  setEmail,
  onSubmit,
  loading
}: ProfileCompletionStepProps) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="fullname" className="text-gray-300">نام کامل *</Label>
        <Input
          id="fullname"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
          placeholder="نام و نام خانوادگی"
        />
      </div>
      <div>
        <Label htmlFor="email" className="text-gray-300">ایمیل (اختیاری)</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
          placeholder="your@email.com"
          dir="ltr"
        />
      </div>
      <Button 
        type="submit" 
        className="w-full bg-blue-600 hover:bg-blue-700"
        disabled={loading}
      >
        {loading ? 'در حال ایجاد حساب...' : 'ایجاد حساب'}
      </Button>
    </form>
  );
};
