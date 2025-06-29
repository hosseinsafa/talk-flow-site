
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Phone, Mail } from 'lucide-react';
import { t } from '@/lib/localization';

interface ProfileCardProps {
  fullName: string;
  displayEmail?: string;
  displayPhone?: string;
  updating: boolean;
  onUpdateProfile: (fullName: string) => Promise<void>;
}

const ProfileCard = ({ 
  fullName: initialFullName, 
  displayEmail, 
  displayPhone, 
  updating, 
  onUpdateProfile 
}: ProfileCardProps) => {
  const [fullName, setFullName] = useState(initialFullName);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateProfile(fullName);
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <User className="w-5 h-5" />
          {t.account.profileInfo}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fullname" className="text-gray-300">{t.account.fullName} (اختیاری)</Label>
              <Input
                id="fullname"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="نام و نام خانوادگی"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            
            {/* Display phone number for phone users */}
            {displayPhone && (
              <div>
                <Label htmlFor="phone" className="text-gray-300 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  شماره موبایل
                </Label>
                <Input
                  id="phone"
                  value={displayPhone}
                  disabled
                  className="bg-gray-700 border-gray-600 text-white opacity-50"
                  dir="ltr"
                />
              </div>
            )}
            
            {/* Display email for email users */}
            {displayEmail && (
              <div>
                <Label htmlFor="email" className="text-gray-300 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {t.account.email}
                </Label>
                <Input
                  id="email"
                  value={displayEmail}
                  disabled
                  className="bg-gray-700 border-gray-600 text-white opacity-50 ltr"
                />
              </div>
            )}
          </div>
          <Button 
            type="submit" 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={updating}
          >
            {updating ? t.account.updating : t.account.updateProfile}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProfileCard;
