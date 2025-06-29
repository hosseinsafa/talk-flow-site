
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  sendOtp: (phoneNumber: string) => Promise<{ error: any, data?: any }>;
  verifyOtp: (phoneNumber: string, otpCode: string) => Promise<{ error: any, data?: any }>;
  completePhoneSignUp: (phoneNumber: string, fullName: string, email?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName || ''
        }
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`
      }
    });
    return { error };
  };

  const sendOtp = async (phoneNumber: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { phone_number: phoneNumber }
      });
      
      if (error) {
        return { error: { message: error.message } };
      }
      
      return { error: null, data };
    } catch (error: any) {
      return { error: { message: 'خطا در ارسال کد تأیید' } };
    }
  };

  const verifyOtp = async (phoneNumber: string, otpCode: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { phone_number: phoneNumber, otp_code: otpCode }
      });
      
      if (error) {
        return { error: { message: error.message } };
      }
      
      return { error: null, data };
    } catch (error: any) {
      return { error: { message: 'خطا در تأیید کد' } };
    }
  };

  const completePhoneSignUp = async (phoneNumber: string, fullName: string, email?: string) => {
    try {
      // Create a proper email format that Supabase will accept
      const cleanPhone = phoneNumber.replace(/[+\s-]/g, '');
      const tempEmail = email || `phone${cleanPhone}@tempuser.app`;
      const tempPassword = Math.random().toString(36).substring(2, 15);
      
      console.log('Creating user with email:', tempEmail);
      
      // Create user with phone number
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: tempEmail,
        password: tempPassword,
        options: {
          data: {
            full_name: fullName,
            phone_number: phoneNumber
          }
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        return { error: authError };
      }

      console.log('User created, now signing in...');

      // Sign in the user immediately after account creation
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: tempEmail,
        password: tempPassword
      });

      if (signInError) {
        console.error('Sign in error:', signInError);
        return { error: signInError };
      }

      console.log('User signed in successfully:', signInData);

      // Update profile with phone number after signing in
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            phone_number: phoneNumber,
            full_name: fullName,
            email: email
          })
          .eq('id', authData.user.id);

        if (profileError) {
          console.error('Profile update error:', profileError);
        }
      }

      return { error: null };
    } catch (error: any) {
      console.error('Complete phone signup error:', error);
      return { error: { message: 'خطا در ایجاد حساب کاربری' } };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });
    return { error };
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      signIn,
      signInWithGoogle,
      sendOtp,
      verifyOtp,
      completePhoneSignUp,
      signOut,
      resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
