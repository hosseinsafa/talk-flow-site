
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== Image generation request started ===');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔑 Checking OpenAI API key...');
    if (!openAIApiKey) {
      console.error('❌ OpenAI API key not found in environment variables');
      throw new Error('OpenAI API key not configured');
    }
    console.log('✅ OpenAI API key found');

    const requestBody = await req.json();
    console.log('📥 Request body received:', JSON.stringify(requestBody, null, 2));
    
    const { prompt, model = 'dall-e-3', n = 1, size = '1024x1024', quality = 'hd' } = requestBody;

    if (!prompt) {
      console.error('❌ No prompt provided');
      throw new Error('Prompt is required for image generation');
    }

    console.log('🎨 Starting DALL·E 3 image generation with params:', {
      model,
      size,
      quality,
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : '')
    });

    console.log('🚀 Making request to OpenAI API...');
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
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📊 OpenAI API response data structure:', {
      hasData: !!data.data,
      dataLength: data.data?.length,
      hasUrl: !!data.data?.[0]?.url,
      created: data.created
    });

    // Log the actual URL for debugging
    if (data.data?.[0]?.url) {
      console.log('🖼️ Generated image URL:', data.data[0].url);
    } else {
      console.error('❌ No image URL in response:', JSON.stringify(data, null, 2));
    }

    // Validate response structure
    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
      console.error('❌ Invalid response structure:', data);
      throw new Error('Invalid response format from OpenAI API');
    }

    if (!data.data[0].url) {
      console.error('❌ No image URL in response data:', data.data[0]);
      throw new Error('No image URL returned from OpenAI API');
    }

    const imageUrl = data.data[0].url;
    console.log('✅ Image generation completed successfully');
    console.log('🔗 Final image URL:', imageUrl);

    // Return consistent format
    const responsePayload = {
      status: 'success',
      data: [{
        url: imageUrl
      }],
      image_url: imageUrl // Also include direct access
    };

    console.log('📤 Sending response:', JSON.stringify(responsePayload, null, 2));

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in generate-image function:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    const errorResponse = { 
      status: 'error',
      error: error.message,
      details: 'Check the function logs for more information'
    };

    console.log('📤 Sending error response:', JSON.stringify(errorResponse, null, 2));
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
