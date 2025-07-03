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

interface ReplicateResponse {
  success: boolean;
  generation_id: string;
  prediction_id: string;
  status: string;
  message: string;
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
      console.log('🚀 === STARTING REPLICATE IMAGE GENERATION ===');
      console.log('📝 Original prompt:', prompt);
      
      // Call the replicate-generate function instead of generate-image
      console.log('📞 Calling replicate-generate function...');
      const functionResponse = await supabase.functions.invoke('replicate-generate', {
        body: {
          prompt: prompt,
          model: 'flux_schnell',
          width: 1024,
          height: 1024,
          steps: 4,
          cfg_scale: 1.0
        }
      });

      console.log('📊 Replicate function response:', functionResponse);

      if (functionResponse.error) {
        console.error('❌ Function error:', functionResponse.error);
        throw new Error(`Replicate generation failed: ${functionResponse.error.message}`);
      }

      if (!functionResponse.data) {
        console.error('❌ No data returned from replicate function');
        throw new Error('No response from Replicate image generation service');
      }

      const responseData: ReplicateResponse = functionResponse.data;

      if (!responseData.success) {
        console.error('❌ Function returned error status:', responseData);
        throw new Error(responseData.error || 'Replicate image generation failed');
      }

      console.log('✅ Replicate generation started with ID:', responseData.prediction_id);
      
      // For now, return a placeholder - in a real implementation you'd poll for completion
      // This is just to test the function call is working
      return `https://via.placeholder.com/1024x1024.png?text=Generation+Started+${responseData.prediction_id}`;
      
    } catch (error) {
      console.error('❌ Error in Replicate generateImage:', error);
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
      console.log('💾 Saving Replicate image generation to database...');
      
      const promptNote = metadata?.generation_count 
        ? `Replicate generation (${metadata.generation_count} images generated at ${metadata.settings?.size || '1024x1024'})`
        : 'Single Replicate generation';
      
      const { data, error } = await supabase
        .from('image_generations')
        .insert({
          user_id: user.id,
          prompt: prompt,
          image_url: imageUrl,
          model_type: 'flux-schnell-replicate',
          status: 'completed',
          width: 1024,
          height: 1024,
          steps: 4,
          cfg_scale: 1.0,
          error_message: metadata ? JSON.stringify({
            type: 'replicate_metadata',
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

      console.log('✅ Replicate image generation saved:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Error saving Replicate image generation:', error);
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
