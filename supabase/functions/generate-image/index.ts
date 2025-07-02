
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== Image generation request received ===');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      console.error('❌ OpenAI API key not found in environment variables');
      throw new Error('OpenAI API key not configured');
    }

    const { prompt, model = 'dall-e-3', n = 1, size = '1024x1024', quality = 'hd' } = await req.json();

    console.log('🎨 Image generation request details:', {
      model,
      size,
      quality,
      prompt: prompt?.substring(0, 100) + '...'
    });

    if (!prompt) {
      console.error('❌ No prompt provided');
      throw new Error('Prompt is required for image generation');
    }

    console.log('🚀 Making request to OpenAI DALL·E 3 API...');

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        n,
        size,
        quality
      }),
    });

    console.log('📡 OpenAI API response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('❌ OpenAI API error response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      const errorMessage = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }

    const data = await response.json();
    console.log('✅ DALL·E 3 generation completed successfully:', {
      created: data.created,
      data_length: data.data?.length,
      image_url: data.data?.[0]?.url ? data.data[0].url.substring(0, 50) + '...' : 'NO URL'
    });

    // Validate response structure
    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
      console.error('❌ Invalid response structure from OpenAI:', data);
      throw new Error('Invalid response format from OpenAI API');
    }

    if (!data.data[0].url) {
      console.error('❌ No image URL in OpenAI response:', data.data[0]);
      throw new Error('No image URL returned from OpenAI API');
    }

    const imageUrl = data.data[0].url;
    console.log('✅ Image URL generated successfully:', imageUrl);

    // Return the expected format for the frontend
    return new Response(JSON.stringify({
      status: 'success',
      data: [{
        url: imageUrl
      }]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in generate-image function:', {
      message: error.message,
      stack: error.stack
    });
    
    return new Response(JSON.stringify({ 
      status: 'error',
      error: error.message,
      details: 'Check the function logs for more information'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
