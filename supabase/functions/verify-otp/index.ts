
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
      .single();

    if (fetchError || !otpRecord) {
      // Increment attempts for this phone number
      await supabase
        .from('otp_verifications')
        .update({ attempts: supabase.sql`attempts + 1` })
        .eq('phone_number', phone_number)
        .eq('verified', false);

      return new Response(
        JSON.stringify({ error: 'کد تأیید نامعتبر یا منقضی است' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

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

    // Check if user already exists with this phone number
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone_number', phone_number)
      .single();

    if (existingProfile) {
      // User exists, create session for existing user
      const { data: authData, error: signInError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: existingProfile.email || `${phone_number.replace('+', '')}@temp.local`,
        options: {
          redirectTo: `${req.headers.get('origin') || 'http://localhost:3000'}/`
        }
      });

      if (signInError) {
        console.error('Sign in error:', signInError);
        return new Response(
          JSON.stringify({ error: 'خطا در ورود به سیستم' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'ورود موفقیت‌آمیز',
          user_exists: true,
          auth_url: authData.properties?.action_link
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // New user, need to create account
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
