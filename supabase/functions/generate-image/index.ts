
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const enhancePrompt = (originalPrompt: string): string => {
  const lowerPrompt = originalPrompt.toLowerCase();
  
  // Check if prompt already has quality keywords
  const hasQualityKeywords = [
    'highly detailed', 'ultra realistic', '8k', 'professional lighting', 'sharp focus',
    'detailed', 'realistic', 'high quality', 'hd', 'professional'
  ].some(keyword => lowerPrompt.includes(keyword));
  
  if (hasQualityKeywords) {
    return originalPrompt;
  }
  
  // Add quality enhancement to match ChatGPT standards
  return `${originalPrompt}, highly detailed, ultra realistic, 8K, professional lighting, sharp focus`;
};

const generateSingleImage = async (prompt: string): Promise<string | null> => {
  try {
    console.log('🎨 Generating single 1024x1024 HD image with enhanced prompt:', prompt.substring(0, 100) + '...');
    
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,                    // DALL·E 3 only supports n=1
        size: '1024x1024',       // ChatGPT standard size
        quality: 'hd',           // High quality for sharpness
        style: 'vivid'           // Vivid style for color vibrance
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error for single generation:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    
    if (!data.data || !data.data[0] || !data.data[0].url) {
      console.error('❌ Invalid response structure for single generation');
      return null;
    }

    const imageUrl = data.data[0].url;
    console.log('✅ Single 1024x1024 HD image generated successfully');
    return imageUrl;
    
  } catch (error) {
    console.error('❌ Error in single image generation:', error);
    return null;
  }
};

serve(async (req) => {
  console.log('🚀 === CHATGPT-QUALITY DALLE-3 GENERATION ===');
  console.log('🔍 Request method:', req.method);
  
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
    console.log('✅ OpenAI API key found');

    console.log('📥 Reading request body...');
    const requestBody = await req.json();
    console.log('📊 Request body received:', JSON.stringify(requestBody, null, 2));
    
    const { prompt } = requestBody;

    if (!prompt) {
      console.error('❌ CRITICAL: No prompt provided in request');
      throw new Error('Prompt is required for image generation');
    }

    // Enhance the prompt for ChatGPT-quality output
    const enhancedPrompt = enhancePrompt(prompt);
    console.log('🎯 Enhanced prompt for ChatGPT quality:', enhancedPrompt);

    console.log('🚀 Starting parallel generation (Best of 4) at 1024x1024 HD...');
    
    // Generate 4 images in parallel for best quality selection
    const generationPromises = Array(4).fill(null).map((_, index) => {
      console.log(`🎨 Starting generation ${index + 1}/4`);
      return generateSingleImage(enhancedPrompt);
    });

    // Wait for all generations to complete
    console.log('⏳ Waiting for all 4 ChatGPT-quality generations to complete...');
    const results = await Promise.allSettled(generationPromises);
    
    // Extract successful URLs
    const imageUrls: string[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        console.log(`✅ Generation ${index + 1}/4 successful - 1024x1024 HD`);
        imageUrls.push(result.value);
      } else {
        console.log(`❌ Generation ${index + 1}/4 failed:`, result.status === 'rejected' ? result.reason : 'No URL returned');
      }
    });

    if (imageUrls.length === 0) {
      console.error('❌ CRITICAL: All 4 ChatGPT-quality generations failed');
      throw new Error('All image generation attempts failed');
    }

    console.log(`🎉 Successfully generated ${imageUrls.length}/4 ChatGPT-quality images at 1024x1024 HD`);

    // For Phase 1: Return the first successful image as primary
    const primaryImageUrl = imageUrls[0];
    console.log('🖼️ Primary ChatGPT-quality image URL:', primaryImageUrl);

    // Test if primary image URL is accessible
    console.log('🔍 Testing primary image URL accessibility...');
    try {
      const imageTestResponse = await fetch(primaryImageUrl, { method: 'HEAD' });
      console.log('✅ Primary image URL test result:', imageTestResponse.status, imageTestResponse.statusText);
    } catch (urlError) {
      console.error('⚠️ Primary image URL test failed:', urlError.message);
    }

    // Return ChatGPT-quality response format
    const responsePayload = {
      status: 'success',
      image_url: primaryImageUrl, // Primary image for backward compatibility
      image_urls: imageUrls, // All generated images for future selection
      generation_count: imageUrls.length,
      enhanced_prompt: enhancedPrompt,
      settings: {
        size: '1024x1024',
        quality: 'hd',
        style: 'vivid',
        model: 'dall-e-3'
      }
    };

    console.log('📤 Sending ChatGPT-quality response:', JSON.stringify({
      ...responsePayload,
      image_urls: imageUrls.map(url => url.substring(0, 50) + '...')
    }, null, 2));

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ CRITICAL: Error in ChatGPT-quality generate-image function:', {
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
