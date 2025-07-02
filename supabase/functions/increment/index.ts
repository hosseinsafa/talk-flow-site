
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { table_name, column_name, user_id } = await req.json();

    console.log('Increment request:', { table_name, column_name, user_id });

    // Validate required parameters
    if (!table_name || !column_name || !user_id) {
      console.error('Missing required parameters:', { table_name, column_name, user_id });
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: table_name, column_name, user_id' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // First check if the user record exists
    const { data: existingRecord, error: selectError } = await supabaseClient
      .from(table_name)
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Error checking existing record:', selectError);
      throw selectError;
    }

    let result;
    if (!existingRecord) {
      // Create new record if it doesn't exist
      console.log('Creating new usage record for user:', user_id);
      const insertData = {
        user_id: user_id,
        [column_name]: 1
      };
      
      result = await supabaseClient
        .from(table_name)
        .insert(insertData);
    } else {
      // Update existing record
      console.log('Updating existing usage record for user:', user_id);
      const currentValue = existingRecord[column_name] || 0;
      const updateData = {
        [column_name]: currentValue + 1
      };
      
      result = await supabaseClient
        .from(table_name)
        .update(updateData)
        .eq('user_id', user_id);
    }

    if (result.error) {
      console.error('Database operation error:', result.error);
      throw result.error;
    }

    console.log('Successfully incremented', column_name, 'for user:', user_id);
    
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in increment function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
