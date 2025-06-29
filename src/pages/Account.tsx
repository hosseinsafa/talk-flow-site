
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useKavenegarAuth } from '@/hooks/useKavenegarAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { User, CreditCard, BarChart3, LogOut, Phone, Mail } from 'lucide-react';
import { t } from '@/lib/localization';

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
  const [fullName, setFullName] = useState('');

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
        setFullName(phoneUserData.full_name || '');

        // For phone users, we'll create mock plan and usage data
        // In a real app, you'd want to link these tables to phone_users as well
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
        setFullName(profileData.full_name || '');

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

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const planLimits = {
    free: { messages: 50, images: 5 },
    pro: { messages: 1000, images: 100 }
  };

  const currentLimits = planLimits[plan?.plan_type as keyof typeof planLimits] || planLimits.free;
  const displayEmail = profile?.email;
  const displayPhone = phoneUserData?.phone_number || profile?.phone_number;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">{t.account.title}</h1>
            <p className="text-gray-400">{t.account.subtitle}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/')} variant="outline" className="border-gray-600 text-gray-300 hover:text-white">
              {t.account.backToChat}
            </Button>
            <Button onClick={handleSignOut} variant="outline" className="border-gray-600 text-gray-300 hover:text-white">
              <LogOut className="w-4 h-4 ml-2" />
              {t.account.signOut}
            </Button>
          </div>
        </div>

        {/* Profile Card */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="w-5 h-5" />
              {t.account.profileInfo}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={updateProfile} className="space-y-4">
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

        {/* Plan Card */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              {t.account.subscriptionPlan}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={plan?.plan_type === 'pro' ? 'default' : 'secondary'} className="capitalize">
                    {plan?.plan_type === 'pro' ? t.account.proPlan : t.account.freePlan}
                  </Badge>
                  <Badge variant={plan?.status === 'active' ? 'default' : 'destructive'} className="capitalize">
                    {plan?.status === 'active' ? t.account.active : t.account.inactive}
                  </Badge>
                </div>
                <p className="text-gray-400">
                  {plan?.plan_type === 'pro' ? t.account.premiumUnlocked : t.account.limitedFeatures}
                </p>
                {plan?.expires_at && (
                  <p className="text-sm text-gray-500">
                    {t.account.expires} {new Date(plan.expires_at).toLocaleDateString('fa-IR')}
                  </p>
                )}
              </div>
              {plan?.plan_type === 'free' && (
                <Button onClick={handleUpgrade} className="bg-green-600 hover:bg-green-700">
                  {t.account.upgradeToPro}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Usage Card */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              {t.account.usageStats}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">{t.account.chatMessages}</span>
                  <span className="text-white font-medium">
                    {usage?.chat_messages_count || 0} / {currentLimits.messages}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min(((usage?.chat_messages_count || 0) / currentLimits.messages) * 100, 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">{t.account.imagesGenerated}</span>
                  <span className="text-white font-medium">
                    {usage?.images_generated_count || 0} / {currentLimits.images}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min(((usage?.images_generated_count || 0) / currentLimits.images) * 100, 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-400">
                {t.account.usageResets} {new Date(usage?.last_reset_date || '').toLocaleDateString('fa-IR')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Account;
