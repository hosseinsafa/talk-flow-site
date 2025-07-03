
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface ImageGenerationResponse {
  status: 'success' | 'error';
  image_url?: string;
  image_urls?: string[];
  generation_count?: number;
  enhanced_prompt?: string;
  settings?: {
    size: string;
    quality: string;
    style: string;
    model: string;
  };
  error?: string;
}

export const useImageGeneration = () => {
  const { user } = useAuth();

  const detectLanguage = (text: string): 'persian' | 'english' => {
    const persianRegex = /[\u0600-\u06FF]/;
    return persianRegex.test(text) ? 'persian' : 'english';
  };

  const isImageGenerationRequest = (text: string): boolean => {
    console.log('🔍 Checking if text is image generation request:', text);
    const lowerText = text.toLowerCase();
    
    const persianPatterns = [
      /تصویر.*بساز/i,
      /عکس.*بساز/i,
      /بساز.*تصویر/i,
      /بساز.*عکس/i,
      /تصویر.*ایجاد/i,
      /عکس.*ایجاد/i,
      /می‌?تون.*تصویر.*بساز/i,
      /می‌?تون.*عکس.*بساز/i
    ];

    const englishPatterns = [
      /generate.*image/i,
      /create.*image/i,
      /make.*image/i,
      /draw.*image/i,
      /image.*of/i,
      /picture.*of/i,
      /generate.*picture/i,
      /create.*picture/i
    ];

    for (const pattern of persianPatterns) {
      if (pattern.test(text)) {
        console.log('✅ Persian image request detected');
        return true;
      }
    }

    for (const pattern of englishPatterns) {
      if (pattern.test(text)) {
        console.log('✅ English image request detected');
        return true;
      }
    }

    console.log('❌ No image request detected');
    return false;
  };

  const generateImage = async (prompt: string) => {
    try {
      console.log('🚀 === STARTING CHATGPT-QUALITY IMAGE GENERATION ===');
      console.log('📝 Original prompt:', prompt);
      
      const functionResponse = await supabase.functions.invoke('generate-image', {
        body: {
          prompt: prompt
        }
      });

      console.log('📊 ChatGPT-quality function response:', functionResponse);

      if (functionResponse.error) {
        console.error('❌ Function error:', functionResponse.error);
        throw new Error(`Image generation failed: ${functionResponse.error.message}`);
      }

      if (!functionResponse.data) {
        console.error('❌ No data returned from ChatGPT-quality function');
        throw new Error('No response from ChatGPT-quality image generation service');
      }

      const responseData: ImageGenerationResponse = functionResponse.data;

      if (responseData.status !== 'success') {
        console.error('❌ Function returned error status:', responseData);
        throw new Error(responseData.error || 'ChatGPT-quality image generation failed');
      }

      if (!responseData.image_url) {
        console.error('❌ No primary image_url in ChatGPT-quality response:', responseData);
        throw new Error('No primary image URL returned from ChatGPT-quality DALL·E 3');
      }

      console.log('✅ === CHATGPT-QUALITY IMAGE GENERATION COMPLETED ===');
      return responseData.image_url;
      
    } catch (error) {
      console.error('❌ Error in ChatGPT-quality generateImage:', error);
      throw error;
    }
  };

  const saveImageToLibrary = async (
    sessionId: string,
    prompt: string, 
    imageUrl: string, 
    modelUsed: string,
    aspectRatio: string
  ) => {
    if (!user) {
      console.log('⚠️ No user found, skipping image library save');
      return;
    }

    try {
      console.log('💾 Saving image to library...');
      
      const { data, error } = await supabase
        .from('image_library')
        .insert({
          user_id: user.id,
          session_id: sessionId,
          prompt: prompt,
          image_url: imageUrl,
          model_used: modelUsed,
          aspect_ratio: aspectRatio
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Image library save error:', error);
        throw error;
      }

      console.log('✅ Image saved to library:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Error saving image to library:', error);
      throw error;
    }
  };

  const saveImageGeneration = async (
    prompt: string, 
    imageUrl: string, 
    metadata?: { 
      generation_count?: number; 
      all_urls?: string[];
      settings?: {
        size: string;
        quality: string;
        style: string;
        model: string;
      };
    }
  ) => {
    if (!user) {
      console.log('⚠️ No user found, skipping database save');
      return;
    }

    try {
      console.log('💾 Saving ChatGPT-quality image generation to database...');
      
      const promptNote = metadata?.generation_count 
        ? `ChatGPT-quality generation (${metadata.generation_count} images generated at ${metadata.settings?.size || '1024x1024'})`
        : 'Single ChatGPT-quality generation';
      
      const { data, error } = await supabase
        .from('image_generations')
        .insert({
          user_id: user.id,
          prompt: prompt,
          image_url: imageUrl,
          model_type: 'dall-e-3-chatgpt-quality',
          status: 'completed',
          width: 1024,
          height: 1024,
          steps: 50,
          cfg_scale: 7.0,
          error_message: metadata ? JSON.stringify({
            type: 'chatgpt_quality_metadata',
            generation_count: metadata.generation_count,
            all_urls_count: metadata.all_urls?.length,
            settings: metadata.settings,
            note: promptNote
          }) : null
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Database save error:', error);
        throw error;
      }

      console.log('✅ ChatGPT-quality image generation saved:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Error saving ChatGPT-quality image generation:', error);
      throw error;
    }
  };

  return {
    detectLanguage,
    isImageGenerationRequest,
    generateImage,
    saveImageToLibrary,
    saveImageGeneration
  };
};
