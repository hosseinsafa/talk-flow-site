
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🚀 === GENERATE IMAGE FUNCTION CALLED ===');
  console.log('🔍 Request method:', req.method);
  console.log('🔍 Request URL:', req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔑 Checking OpenAI API key...');
    if (!openAIApiKey) {
      console.error('❌ CRITICAL: OpenAI API key not found in environment variables');
      throw new Error('OpenAI API key not configured');
    }
    console.log('✅ OpenAI API key found:', openAIApiKey ? 'YES' : 'NO');

    console.log('📥 Reading request body...');
    const requestBody = await req.json();
    console.log('📊 Full request body:', JSON.stringify(requestBody, null, 2));
    
    const { prompt, model = 'dall-e-3', n = 1, size = '1024x1024', quality = 'hd' } = requestBody;

    if (!prompt) {
      console.error('❌ CRITICAL: No prompt provided in request');
      throw new Error('Prompt is required for image generation');
    }

    console.log('🎨 Image generation parameters:', {
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      model,
      size,
      quality,
      n
    });

    console.log('🚀 Making OpenAI API request...');
    const openAIResponse = await fetch('https://api.openai.com/v1/images/generations', {
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

    console.log('📡 OpenAI API response status:', openAIResponse.status, openAIResponse.statusText);

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('❌ CRITICAL: OpenAI API error:', {
        status: openAIResponse.status,
        statusText: openAIResponse.statusText,
        error: errorText
      });
      
      throw new Error(`OpenAI API error: ${openAIResponse.status} - ${errorText}`);
    }

    const openAIData = await openAIResponse.json();
    console.log('📊 OpenAI response structure:', {
      hasData: !!openAIData.data,
      dataLength: openAIData.data?.length,
      hasUrl: !!openAIData.data?.[0]?.url,
      created: openAIData.created,
      fullResponse: JSON.stringify(openAIData, null, 2)
    });

    // Validate response structure
    if (!openAIData.data || !Array.isArray(openAIData.data) || openAIData.data.length === 0) {
      console.error('❌ CRITICAL: Invalid OpenAI response structure:', openAIData);
      throw new Error('Invalid response format from OpenAI API');
    }

    if (!openAIData.data[0].url) {
      console.error('❌ CRITICAL: No image URL in OpenAI response:', openAIData.data[0]);
      throw new Error('No image URL returned from OpenAI API');
    }

    const imageUrl = openAIData.data[0].url;
    console.log('🖼️ Generated image URL:', imageUrl);

    // Test if image URL is accessible
    console.log('🔍 Testing image URL accessibility...');
    try {
      const imageTestResponse = await fetch(imageUrl, { method: 'HEAD' });
      console.log('✅ Image URL test result:', imageTestResponse.status, imageTestResponse.statusText);
    } catch (urlError) {
      console.error('⚠️ Image URL test failed:', urlError.message);
    }

    // Return standardized format
    const responsePayload = {
      status: 'success',
      image_url: imageUrl
    };

    console.log('📤 Sending final response:', JSON.stringify(responsePayload, null, 2));

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ CRITICAL: Error in generate-image function:', {
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
