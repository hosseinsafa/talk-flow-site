
import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { t } from '@/lib/localization';

interface AccountHeaderProps {
  onSignOut: () => void;
}

const AccountHeader = ({ onSignOut }: AccountHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-white">{t.account.title}</h1>
        <p className="text-gray-400">{t.account.subtitle}</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => navigate('/')} variant="outline" className="border-gray-600 text-gray-300 hover:text-white">
          {t.account.backToChat}
        </Button>
        <Button onClick={onSignOut} variant="outline" className="border-gray-600 text-gray-300 hover:text-white">
          <LogOut className="w-4 h-4 ml-2" />
          {t.account.signOut}
        </Button>
      </div>
    </div>
  );
};

export default AccountHeader;
