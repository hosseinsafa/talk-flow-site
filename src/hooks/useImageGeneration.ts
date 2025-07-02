
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

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
      console.log('🚀 === STARTING IMAGE GENERATION ===');
      console.log('📝 Prompt:', prompt);
      
      console.log('📡 Calling generate-image function...');
      const functionResponse = await supabase.functions.invoke('generate-image', {
        body: {
          prompt: prompt,
          model: 'dall-e-3',
          size: '1024x1024',
          quality: 'hd',
          n: 1
        }
      });

      console.log('📊 Function response:', {
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
        console.error('❌ No data returned from function');
        throw new Error('No response from image generation service');
      }

      const responseData = functionResponse.data;
      console.log('📋 Response data:', responseData);

      if (responseData.status !== 'success') {
        console.error('❌ Function returned error status:', responseData);
        throw new Error(responseData.error || 'Image generation failed');
      }

      if (!responseData.image_url) {
        console.error('❌ No image_url in response:', responseData);
        throw new Error('No image URL returned from DALL·E 3');
      }

      const imageUrl = responseData.image_url;
      console.log('🖼️ Image URL:', imageUrl);
      
      // Save to database
      await saveImageGeneration(prompt, imageUrl);
      
      console.log('✅ === IMAGE GENERATION COMPLETED ===');
      return imageUrl;
      
    } catch (error) {
      console.error('❌ Error in generateImage:', error);
      throw error;
    }
  };

  const saveImageGeneration = async (prompt: string, imageUrl: string) => {
    if (!user) {
      console.log('⚠️ No user found, skipping database save');
      return;
    }

    try {
      console.log('💾 Saving image generation to database...');
      
      const { data, error } = await supabase
        .from('image_generations')
        .insert({
          user_id: user.id,
          prompt: prompt,
          image_url: imageUrl,
          model_type: 'dall-e-3',
          status: 'completed',
          width: 1024,
          height: 1024,
          steps: 50,
          cfg_scale: 7.0
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Database save error:', error);
        throw error;
      }

      console.log('✅ Image generation saved:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Error saving image generation:', error);
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
