import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useKavenegarAuth } from '@/hooks/useKavenegarAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { t } from '@/lib/localization';
import AccountHeader from '@/components/account/AccountHeader';
import ProfileCard from '@/components/account/ProfileCard';
import PlanCard from '@/components/account/PlanCard';
import UsageCard from '@/components/account/UsageCard';

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number?: string | null;
}

interface PhoneUser {
  id: string;
  phone_number: string;
  full_name: string | null;
}

interface UserPlan {
  plan_type: string;
  status: string;
  expires_at: string | null;
}

interface UserUsage {
  chat_messages_count: number;
  images_generated_count: number;
  last_reset_date: string;
}

const Account = () => {
  const { user, signOut } = useAuth();
  const { user: phoneUser, logout: phoneLogout, isAuthenticated: isPhoneAuth } = useKavenegarAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [phoneUserData, setPhoneUserData] = useState<PhoneUser | null>(null);
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const currentUser = phoneUser || user;
  const isPhoneUser = isPhoneAuth();

  useEffect(() => {
    if (!currentUser) {
      navigate('/auth');
      return;
    }
    
    fetchUserData();
  }, [currentUser, navigate, isPhoneUser]);

  const fetchUserData = async () => {
    try {
      if (isPhoneUser && phoneUser) {
        // Fetch phone user data
        const { data: phoneUserData, error: phoneUserError } = await supabase
          .from('phone_users')
          .select('*')
          .eq('id', phoneUser.id)
          .single();

        if (phoneUserError) throw phoneUserError;
        
        setPhoneUserData(phoneUserData);

        setPlan({
          plan_type: 'free',
          status: 'active',
          expires_at: null
        });
        
        setUsage({
          chat_messages_count: 0,
          images_generated_count: 0,
          last_reset_date: new Date().toISOString()
        });
      } else if (user) {
        // Fetch Supabase Auth user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);

        // Fetch plan
        const { data: planData, error: planError } = await supabase
          .from('user_plans')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (planError) throw planError;
        setPlan(planData);

        // Fetch usage
        const { data: usageData, error: usageError } = await supabase
          .from('user_usage')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (usageError) throw usageError;
        setUsage(usageData);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: t.account.error,
        description: t.account.errorLoadingData,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (fullName: string) => {
    setUpdating(true);

    try {
      if (isPhoneUser && phoneUser) {
        // Update phone user
        const { error } = await supabase
          .from('phone_users')
          .update({ full_name: fullName || null })
          .eq('id', phoneUser.id);

        if (error) throw error;
      } else if (user) {
        // Update Supabase Auth user profile
        const { error } = await supabase
          .from('profiles')
          .update({ full_name: fullName || null })
          .eq('id', user.id);

        if (error) throw error;
      }

      toast({
        title: t.common.success,
        description: t.account.profileUpdated
      });
      
      fetchUserData();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: t.account.error,
        description: t.account.updateError,
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleSignOut = async () => {
    if (isPhoneUser) {
      phoneLogout();
    } else {
      await signOut();
    }
    navigate('/auth');
  };

  const handleUpgrade = () => {
    navigate('/payment');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white">{t.account.loading}</div>
      </div>
    );
  }

  const displayEmail = profile?.email;
  const displayPhone = phoneUserData?.phone_number || profile?.phone_number;
  const fullName = phoneUserData?.full_name || profile?.full_name || '';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <AccountHeader onSignOut={handleSignOut} />
        
        <ProfileCard 
          fullName={fullName}
          displayEmail={displayEmail}
          displayPhone={displayPhone}
          updating={updating}
          onUpdateProfile={updateProfile}
        />

        <PlanCard 
          plan={plan}
          onUpgrade={handleUpgrade}
        />

        <UsageCard 
          usage={usage}
          plan={plan}
        />
      </div>
    </div>
  );
};

export default Account;
