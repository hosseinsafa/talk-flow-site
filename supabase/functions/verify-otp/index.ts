
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone_number, otp_code } = await req.json();
    console.log('Verifying OTP for phone:', phone_number, 'with code:', otp_code);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find valid OTP
    const { data: otpRecord, error: fetchError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone_number', phone_number)
      .eq('otp_code', otp_code)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpRecord) {
      console.log('OTP verification failed:', fetchError);
      
      // Get current attempts for this phone number and increment
      const { data: existingOtp } = await supabase
        .from('otp_verifications')
        .select('attempts')
        .eq('phone_number', phone_number)
        .eq('verified', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingOtp) {
        const newAttempts = existingOtp.attempts + 1;
        await supabase
          .from('otp_verifications')
          .update({ attempts: newAttempts })
          .eq('phone_number', phone_number)
          .eq('verified', false);
      }

      return new Response(
        JSON.stringify({ error: 'کد تأیید نامعتبر یا منقضی است' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('OTP record found:', otpRecord);

    // Check attempts limit
    if (otpRecord.attempts >= 5) {
      return new Response(
        JSON.stringify({ error: 'تعداد تلاش‌های مجاز تمام شده است. لطفاً مجدداً درخواست کنید' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    // Mark OTP as verified
    const { error: updateError } = await supabase
      .from('otp_verifications')
      .update({ verified: true })
      .eq('id', otpRecord.id);

    if (updateError) {
      console.error('Error updating OTP record:', updateError);
      return new Response(
        JSON.stringify({ error: 'خطای داخلی سرور' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('OTP marked as verified');

    // Check if user already exists with this phone number
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone_number', phone_number)
      .single();

    console.log('Existing profile check:', existingProfile);

    if (existingProfile) {
      // User exists - create a temporary user and sign them in
      const tempEmail = `${phone_number.replace(/\+/g, '').replace(/^0/, '98')}@temp.local`;
      
      console.log('Creating temp user with email:', tempEmail);

      // Try to create or get existing auth user
      const { data: authUser, error: signUpError } = await supabase.auth.admin.createUser({
        email: tempEmail,
        password: Math.random().toString(36).substring(2, 15),
        phone: phone_number,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: {
          phone_number: phone_number,
          phone_verified: true
        }
      });

      if (signUpError && !signUpError.message.includes('already registered')) {
        console.error('Error creating auth user:', signUpError);
        return new Response(
          JSON.stringify({ error: 'خطا در ایجاد کاربر' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      // Update the existing profile with the auth user ID if needed
      if (authUser?.user && existingProfile.id !== authUser.user.id) {
        await supabase
          .from('profiles')
          .update({ id: authUser.user.id })
          .eq('phone_number', phone_number);
      }

      // Generate access token for the user
      const { data: tokenData, error: tokenError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: tempEmail,
        options: {
          redirectTo: `${req.headers.get('origin') || 'http://localhost:3000'}/`
        }
      });

      if (tokenError) {
        console.error('Token generation error:', tokenError);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'ورود موفقیت‌آمیز',
          user_exists: true,
          auth_url: tokenData?.properties?.action_link
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // New user - need to complete profile
      console.log('New user - profile completion needed');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'تأیید موفقیت‌آمیز - لطفاً اطلاعات خود را تکمیل کنید',
          user_exists: false,
          phone_number: phone_number
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in verify-otp function:', error);
    return new Response(
      JSON.stringify({ error: 'خطای داخلی سرور' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
