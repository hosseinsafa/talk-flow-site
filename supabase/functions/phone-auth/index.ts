
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
      // Send OTP - Mock implementation for testing
      if (phone_number) {
        // Verify phone number format
        const phoneRegex = /^(\+98|0098|98|0)?9[0-9]{9}$/;
        if (!phoneRegex.test(phone_number)) {
          return new Response(
            JSON.stringify({ error: 'Invalid phone number format' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        // Use fixed OTP for testing
        const otpCode = '123456';
        
        const normalizedPhone = phone_number.replace(/^(\+98|0098|98|0)/, '');
        const fullPhone = normalizedPhone.startsWith('9') ? '+98' + normalizedPhone : phone_number;
        
        console.log('MOCK OTP SYSTEM - Phone:', fullPhone, 'OTP Code:', otpCode);
        console.log('=== FOR TESTING: Use OTP code 123456 ===');
        
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
            message: 'OTP sent successfully (MOCK)',
            phone_number: fullPhone,
            mock_otp: otpCode // Include OTP in response for testing
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (req.method === 'PATCH') {
      // Verify OTP and create session
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

      // Check if user exists in profiles table
      const { data: existingProfile } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('phone_number', fullPhone)
        .single();

      let userId;

      if (existingProfile) {
        // User exists - use existing user ID
        userId = existingProfile.id;
        console.log('Existing user found:', userId);
      } else {
        // New user - create auth user and profile
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
            JSON.stringify({ error: 'Failed to create user' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }

        userId = authUser.user.id;

        // Create profile
        await supabaseClient
          .from('profiles')
          .insert({
            id: userId,
            phone_number: fullPhone,
            full_name: '',
            email: tempEmail
          });

        console.log('New user created:', userId);
      }

      // Create a session token for the user
      const { data: sessionData, error: sessionError } = await supabaseClient.auth.admin.generateLink({
        type: 'magiclink',
        email: existingProfile?.email || `${fullPhone.replace(/\+/g, '').replace(/^0/, '98')}@tempuser.app`,
        options: {
          redirectTo: `${req.headers.get('origin') || 'http://localhost:3000'}/`
        }
      });

      if (sessionError) {
        console.error('Error creating session:', sessionError);
        return new Response(
          JSON.stringify({ error: 'Failed to create session' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      console.log('Session created successfully for user:', userId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: existingProfile ? 'Login successful' : 'Registration and login successful',
          user_exists: !!existingProfile,
          auth_url: sessionData?.properties?.action_link
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
