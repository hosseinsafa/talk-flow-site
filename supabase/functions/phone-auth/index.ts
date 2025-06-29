
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
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (req.method === 'POST') {
      // Send OTP using Kavenegar Send API
      if (phone_number) {
        // Verify phone number format
        const phoneRegex = /^(\+98|0098|98|0)?9[0-9]{9}$/;
        if (!phoneRegex.test(phone_number)) {
          return new Response(
            JSON.stringify({ error: 'Invalid phone number format' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        // Generate OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Get Kavenegar API key
        const kavenegarApiKey = Deno.env.get('KAVENEGAR_API_KEY');
        if (!kavenegarApiKey) {
          return new Response(
            JSON.stringify({ error: 'SMS service not configured' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }

        const normalizedPhone = phone_number.replace(/^(\+98|0098|98|0)/, '');
        const fullPhone = normalizedPhone.startsWith('9') ? '+98' + normalizedPhone : phone_number;
        const receptorPhone = normalizedPhone.startsWith('9') ? '0' + normalizedPhone : phone_number;
        
        // Use Kavenegar Send API to send OTP
        const message = `Your verification code is: ${otpCode}`;
        const kavenegarUrl = `https://api.kavenegar.com/v1/${kavenegarApiKey}/sms/send.json`;
        
        console.log('Sending OTP via Kavenegar Send API to:', receptorPhone, 'with code:', otpCode);
        
        const kavenegarResponse = await fetch(kavenegarUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            receptor: receptorPhone,
            message: message,
            sender: '2000660110' // Kavenegar's high-speed test line
          })
        });

        const kavenegarResult = await kavenegarResponse.json();
        console.log('Kavenegar response:', kavenegarResult);

        if (!kavenegarResponse.ok || kavenegarResult.return?.status !== 200) {
          console.error('Kavenegar error:', kavenegarResult);
          return new Response(
            JSON.stringify({ error: 'Failed to send OTP' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }

        // Store OTP in database for verification
        const { error: dbError } = await supabaseClient
          .from('otp_verifications')
          .insert({
            phone_number: fullPhone,
            otp_code: otpCode,
            verified: false,
            attempts: 0,
          });

        if (dbError) {
          console.error('Database error:', dbError);
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'OTP sent successfully',
            phone_number: fullPhone 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (req.method === 'PATCH') {
      // Verify OTP
      const { phone_number: phoneNum, otp_code } = await req.json();
      
      const normalizedPhone = phoneNum.replace(/^(\+98|0098|98|0)/, '');
      const fullPhone = normalizedPhone.startsWith('9') ? '+98' + normalizedPhone : phoneNum;

      // Get stored OTP from database
      const { data: otpRecords, error: fetchError } = await supabaseClient
        .from('otp_verifications')
        .select('*')
        .eq('phone_number', fullPhone)
        .eq('verified', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError || !otpRecords || otpRecords.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No valid OTP found for this phone number' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const otpRecord = otpRecords[0];

      if (otpRecord.attempts >= 5) {
        return new Response(
          JSON.stringify({ error: 'Too many attempts' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        );
      }

      // Verify that the provided OTP matches the stored one
      if (otpRecord.otp_code !== otp_code) {
        // Increment attempts
        await supabaseClient
          .from('otp_verifications')
          .update({ attempts: otpRecord.attempts + 1 })
          .eq('id', otpRecord.id);

        return new Response(
          JSON.stringify({ error: 'Invalid OTP code' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Mark OTP as verified
      await supabaseClient
        .from('otp_verifications')
        .update({ verified: true })
        .eq('id', otpRecord.id);

      // Check if user exists
      const { data: existingProfile } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('phone_number', fullPhone)
        .limit(1);

      if (existingProfile && existingProfile.length > 0) {
        // User exists - sign them in
        const tempEmail = `${fullPhone.replace(/\+/g, '').replace(/^0/, '98')}@tempuser.app`;
        
        const { data: authUser, error: signInError } = await supabaseClient.auth.admin.createUser({
          email: tempEmail,
          password: Math.random().toString(36).substring(2, 15),
          phone: fullPhone,
          email_confirm: true,
          phone_confirm: true,
          user_metadata: {
            phone_number: fullPhone,
            phone_verified: true
          }
        });

        if (signInError && !signInError.message.includes('already registered')) {
          console.error('Error creating auth user:', signInError);
        }

        // Generate session
        const { data: sessionData, error: sessionError } = await supabaseClient.auth.admin.generateLink({
          type: 'magiclink',
          email: tempEmail,
          options: {
            redirectTo: `${req.headers.get('origin') || 'http://localhost:3000'}/`
          }
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Login successful',
            user_exists: true,
            auth_url: sessionData?.properties?.action_link
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // New user - create profile and sign them in
        const tempEmail = `${fullPhone.replace(/\+/g, '').replace(/^0/, '98')}@tempuser.app`;
        
        const { data: authUser, error: createError } = await supabaseClient.auth.admin.createUser({
          email: tempEmail,
          password: Math.random().toString(36).substring(2, 15),
          phone: fullPhone,
          email_confirm: true,
          phone_confirm: true,
          user_metadata: {
            phone_number: fullPhone,
            phone_verified: true
          }
        });

        if (createError) {
          console.error('Error creating user:', createError);
          return new Response(
            JSON.stringify({ error: 'Failed to create user session' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }

        // Create profile
        if (authUser?.user) {
          await supabaseClient
            .from('profiles')
            .insert({
              id: authUser.user.id,
              phone_number: fullPhone,
              full_name: '',
              email: ''
            });
        }

        // Generate session 
        const { data: sessionData, error: sessionError } = await supabaseClient.auth.admin.generateLink({
          type: 'magiclink',
          email: tempEmail,
          options: {
            redirectTo: `${req.headers.get('origin') || 'http://localhost:3000'}/`
          }
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Registration and login successful',
            user_exists: false,
            auth_url: sessionData?.properties?.action_link
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    );

  } catch (error) {
    console.error('Error in phone-auth function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
