
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
    
    // Enhanced patterns for image generation detection
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
      
      console.log('📡 Calling ChatGPT-quality generate-image function...');
      const functionResponse = await supabase.functions.invoke('generate-image', {
        body: {
          prompt: prompt
        }
      });

      console.log('📊 ChatGPT-quality function response:', {
        data: functionResponse.data,
        error: functionResponse.error,
        hasData: !!functionResponse.data,
        hasError: !!functionResponse.error
      });

      if (functionResponse.error) {
        console.error('❌ Function error:', functionResponse.error);
        throw new Error(`Image generation failed: ${functionResponse.error.message}`);
      }

      if (!functionResponse.data) {
        console.error('❌ No data returned from ChatGPT-quality function');
        throw new Error('No response from ChatGPT-quality image generation service');
      }

      const responseData: ImageGenerationResponse = functionResponse.data;
      console.log('📋 ChatGPT-quality response data:', responseData);

      if (responseData.status !== 'success') {
        console.error('❌ Function returned error status:', responseData);
        throw new Error(responseData.error || 'ChatGPT-quality image generation failed');
      }

      if (!responseData.image_url) {
        console.error('❌ No primary image_url in ChatGPT-quality response:', responseData);
        throw new Error('No primary image URL returned from ChatGPT-quality DALL·E 3');
      }

      const primaryImageUrl = responseData.image_url;
      const allImageUrls = responseData.image_urls || [primaryImageUrl];
      const generationCount = responseData.generation_count || 1;
      const enhancedPrompt = responseData.enhanced_prompt || prompt;
      const settings = responseData.settings;
      
      console.log('🖼️ ChatGPT-quality generation results:', {
        primaryImageUrl: primaryImageUrl.substring(0, 50) + '...',
        totalGenerated: generationCount,
        allUrls: allImageUrls.length,
        enhancedPrompt: enhancedPrompt.substring(0, 100) + '...',
        settings: settings
      });
      
      // Save to database with ChatGPT-quality metadata
      await saveImageGeneration(enhancedPrompt, primaryImageUrl, {
        generation_count: generationCount,
        all_urls: allImageUrls,
        settings: settings
      });
      
      console.log('✅ === CHATGPT-QUALITY IMAGE GENERATION COMPLETED ===');
      return primaryImageUrl;
      
    } catch (error) {
      console.error('❌ Error in ChatGPT-quality generateImage:', error);
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
      
      // Create enhanced prompt note for database
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
          // Store metadata in error_message field as JSON string for now
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
    saveImageGeneration
  };
};
