
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
    const { phone_number } = await req.json();
    
    // Validate Iranian phone number format
    const iranPhoneRegex = /^(\+98|0098|98|0)?9[0-9]{9}$/;
    if (!iranPhoneRegex.test(phone_number)) {
      return new Response(
        JSON.stringify({ error: 'شماره تلفن معتبر نمی‌باشد' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Normalize phone number to +98 format
    let normalizedPhone = phone_number.replace(/^(\+98|0098|98|0)/, '');
    if (normalizedPhone.startsWith('9')) {
      normalizedPhone = '+98' + normalizedPhone;
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Clean up expired OTPs
    await supabase
      .from('otp_verifications')
      .delete()
      .lt('expires_at', new Date().toISOString());

    // Check if there's a recent OTP for this phone number (rate limiting)
    const { data: recentOtp } = await supabase
      .from('otp_verifications')
      .select('created_at')
      .eq('phone_number', normalizedPhone)
      .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Last minute
      .single();

    if (recentOtp) {
      return new Response(
        JSON.stringify({ error: 'لطفاً یک دقیقه صبر کنید و مجدداً تلاش کنید' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    // Store OTP in database
    const { error: dbError } = await supabase
      .from('otp_verifications')
      .insert({
        phone_number: normalizedPhone,
        otp_code: otpCode,
        verified: false,
        attempts: 0,
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'خطای داخلی سرور' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Send SMS via Kavenegar
    const kavenegarApiKey = Deno.env.get('KAVENEGAR_API_KEY');
    const kavenegarUrl = `https://api.kavenegar.com/v1/${kavenegarApiKey}/verify/lookup.json`;
    
    const kavenegarResponse = await fetch(kavenegarUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        receptor: normalizedPhone,
        token: otpCode,
        template: 'verify', // You may need to adjust this based on your Kavenegar template
      }),
    });

    const kavenegarResult = await kavenegarResponse.json();
    
    if (!kavenegarResponse.ok) {
      console.error('Kavenegar error:', kavenegarResult);
      return new Response(
        JSON.stringify({ error: 'خطا در ارسال پیامک' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('OTP sent successfully to:', normalizedPhone);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'کد تأیید با موفقیت ارسال شد',
        phone_number: normalizedPhone 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-otp function:', error);
    return new Response(
      JSON.stringify({ error: 'خطای داخلی سرور' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
