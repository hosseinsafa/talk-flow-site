
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { create, verify } from 'https://deno.land/x/djwt@v3.0.1/mod.ts'

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

    // Normalize phone number
    let normalizedPhone = phone_number.replace(/^(\+98|0098|98|0)/, '');
    if (normalizedPhone.startsWith('9')) {
      normalizedPhone = '+98' + normalizedPhone;
    } else {
      normalizedPhone = '+98' + normalizedPhone;
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find valid OTP
    const { data: otpRecords, error: fetchError } = await supabase
      .from('phone_otp_codes')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .eq('otp_code', otp_code)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Database error:', fetchError);
      return new Response(
        JSON.stringify({ error: 'خطای داخلی سرور' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!otpRecords || otpRecords.length === 0) {
      console.log('Invalid OTP code');
      
      // Increment attempts
      await supabase
        .from('phone_otp_codes')
        .update({ attempts: supabase.sql`${supabase.sql`attempts`} + 1` })
        .eq('phone_number', normalizedPhone)
        .eq('verified', false);

      return new Response(
        JSON.stringify({ error: 'کد تأیید نامعتبر یا منقضی است' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const otpRecord = otpRecords[0];

    // Check attempts limit
    if (otpRecord.attempts >= 5) {
      return new Response(
        JSON.stringify({ error: 'تعداد تلاش‌های مجاز تمام شده است' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    // Mark OTP as verified
    const { error: updateError } = await supabase
      .from('phone_otp_codes')
      .update({ verified: true })
      .eq('id', otpRecord.id);

    if (updateError) {
      console.error('Error updating OTP:', updateError);
      return new Response(
        JSON.stringify({ error: 'خطای داخلی سرور' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Check if user exists or create new user
    let { data: user, error: userError } = await supabase
      .from('phone_users')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .single();

    if (userError && userError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching user:', userError);
      return new Response(
        JSON.stringify({ error: 'خطای داخلی سرور' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!user) {
      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from('phone_users')
        .insert({
          phone_number: normalizedPhone,
          last_login_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user:', createError);
        return new Response(
          JSON.stringify({ error: 'خطای ایجاد کاربر' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      user = newUser;
    } else {
      // Update last login
      await supabase
        .from('phone_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', user.id);
    }

    // Create JWT token
    const jwtSecret = Deno.env.get('JWT_SECRET') || 'your-super-secret-jwt-key-change-in-production';
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(jwtSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );

    const payload = {
      user_id: user.id,
      phone_number: user.phone_number,
      full_name: user.full_name,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    const jwt = await create({ alg: 'HS256', typ: 'JWT' }, payload, key);

    console.log('Login successful for user:', user.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'ورود موفقیت‌آمیز',
        token: jwt,
        user: {
          id: user.id,
          phone_number: user.phone_number,
          full_name: user.full_name
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-phone-otp function:', error);
    return new Response(
      JSON.stringify({ error: 'خطای داخلی سرور' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
