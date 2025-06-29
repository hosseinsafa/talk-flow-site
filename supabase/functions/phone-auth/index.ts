
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { phone, code } = await req.json();
    console.log('Phone auth request:', { phone, code });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (!phone || !code) {
      console.log('Missing phone or code');
      return new Response(
        JSON.stringify({ error: "Phone and code are required." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if user exists
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error listing users:', userError);
      throw userError;
    }

    let user = users.users?.find(u => u.phone === phone);

    if (!user) {
      console.log('Creating new user for phone:', phone);
      // Create user if not exist
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        phone,
        phone_confirm: true,
      });
      
      if (createError) {
        console.error('Error creating user:', createError);
        throw createError;
      }
      
      user = newUser.user;
      console.log('New user created:', user.id);
    } else {
      console.log('Existing user found:', user.id);
    }

    // Verify OTP code manually (mock for now, replace with Kavenegar check if needed)
    if (code !== "123456") {
      console.log('Invalid OTP code provided:', code);
      return new Response(
        JSON.stringify({ error: "Invalid OTP code." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log('OTP verified, creating session for user:', user.id);

    // Create session after verification
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.createSession({
      user_id: user.id,
    });

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      throw sessionError;
    }

    console.log('Session created successfully');

    return new Response(
      JSON.stringify({ 
        message: "Login successful.", 
        session: sessionData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (err) {
    console.error("Edge Function error:", err);
    return new Response(
      JSON.stringify({ error: err.message || err.toString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
