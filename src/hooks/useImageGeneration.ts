
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const useImageGeneration = () => {
  const { user } = useAuth();

  const detectLanguage = (text: string): 'persian' | 'english' => {
    const persianRegex = /[\u0600-\u06FF]/;
    return persianRegex.test(text) ? 'persian' : 'english';
  };

  const isImageGenerationRequest = (text: string): { isRequest: boolean; hasSpecificObject: boolean; object?: string } => {
    console.log('🔍 Checking if text is image generation request:', text);
    const lowerText = text.toLowerCase();
    
    const persianPatterns = [
      /می‌?تون(ی|ید)\s+(تصویر|عکس)\s+(.+?)\s+بساز(ی|ید)/i,
      /می‌?تون(ی|ید)\s+(تصویر|عکس)\s+بساز(ی|ید)/i,
      /(تصویر|عکس)\s+(.+?)\s+بساز/i,
      /(بساز|ایجاد کن|درست کن)\s+(تصویر|عکس)/i,
      /می‌?تون(ی|ید)\s+(.+?)\s+(تصویر|عکس)\s+بساز(ی|ید)/i,
      /(تصویر|عکس)\s+(یک|یه)\s+(.+?)\s+بساز/i
    ];

    const englishPatterns = [
      /can you (generate|create|make|draw)\s+(an?|the)?\s*image\s+of\s+(.+)/i,
      /can you (generate|create|make|draw)\s+(an?|the)?\s*(image|picture|photo)/i,
      /(generate|create|make|draw)\s+(an?|the)?\s*image\s+of\s+(.+)/i,
      /(generate|create|make|draw)\s+(an?|the)?\s*(image|picture|photo)/i,
      /can you.*image/i,
      /generate.*image/i,
      /create.*image/i,
      /make.*image/i
    ];

    for (const pattern of persianPatterns) {
      const match = text.match(pattern);
      if (match) {
        console.log('✅ Persian image request detected:', match);
        const objectMatch = match[3] || match[2];
        if (objectMatch && !['تصویر', 'عکس', 'بساز', 'بسازی', 'بسازید'].includes(objectMatch.trim())) {
          console.log('✅ Found specific object in Persian:', objectMatch);
          return { isRequest: true, hasSpecificObject: true, object: objectMatch.trim() };
        }
        return { isRequest: true, hasSpecificObject: false };
      }
    }

    for (const pattern of englishPatterns) {
      const match = text.match(pattern);
      if (match) {
        console.log('✅ English image request detected:', match);
        const objectMatch = match[3];
        if (objectMatch) {
          console.log('✅ Found specific object in English:', objectMatch);
          return { isRequest: true, hasSpecificObject: true, object: objectMatch.trim() };
        }
        return { isRequest: true, hasSpecificObject: false };
      }
    }

    const persianKeywords = ['تصویر', 'عکس', 'بساز', 'ایجاد', 'طراحی'];
    const englishKeywords = ['generate', 'create', 'make', 'image', 'picture', 'photo'];
    
    const hasPersianKeywords = persianKeywords.some(keyword => lowerText.includes(keyword));
    const hasEnglishKeywords = englishKeywords.some(keyword => lowerText.includes(keyword));
    
    if (hasPersianKeywords || hasEnglishKeywords) {
      console.log('✅ Basic keyword match found');
      return { isRequest: true, hasSpecificObject: false };
    }

    console.log('❌ No image request detected');
    return { isRequest: false, hasSpecificObject: false };
  };

  const isConfirmationMessage = (text: string): boolean => {
    const confirmationKeywords = [
      'yes', 'ok', 'sure', 'confirm', 'proceed', 'go ahead',
      'بله', 'تایید', 'باشه', 'اوکی', 'ادامه', 'برو', 'بساز', 'آره', 'اره'
    ];
    
    const lowerText = text.toLowerCase().trim();
    const isConfirmation = confirmationKeywords.some(keyword => 
      lowerText === keyword || lowerText.includes(keyword)
    );
    
    console.log('🔍 Checking confirmation:', text, '→', isConfirmation);
    return isConfirmation;
  };

  const savePendingImageRequest = async (sessionId: string, prompt: string) => {
    if (!user) return null;

    try {
      console.log('💾 Saving pending image request:', prompt);
      
      await supabase
        .from('pending_image_requests')
        .delete()
        .eq('user_id', user.id)
        .eq('status', 'pending');

      const { data, error } = await supabase
        .from('pending_image_requests')
        .insert({
          user_id: user.id,
          session_id: sessionId,
          prompt: prompt,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      console.log('✅ Pending request saved:', data.id);
      return data.id;
    } catch (error) {
      console.error('❌ Error saving pending image request:', error);
      return null;
    }
  };

  const getPendingImageRequest = async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('pending_image_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      console.log('🔍 Found pending request:', data);
      return data;
    } catch (error) {
      console.error('Error getting pending image request:', error);
      return null;
    }
  };

  const markPendingRequestCompleted = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('pending_image_requests')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;
      console.log('✅ Marked request as completed');
    } catch (error) {
      console.error('Error marking request as completed:', error);
    }
  };

  const generateImage = async (prompt: string) => {
    try {
      console.log('🎨 Starting image generation process...');
      console.log('📝 Original prompt:', prompt);
      
      // Enhanced prompt for better results
      const enhancedPrompt = `${prompt}, high quality, detailed, professional, 4k`;
      console.log('🚀 Enhanced prompt:', enhancedPrompt);
      
      console.log('📡 Calling generate-image function...');
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: {
          prompt: enhancedPrompt,
          model: 'dall-e-3',
          size: '1024x1024',
          quality: 'hd',
          n: 1
        }
      });

      console.log('📊 Function response:', { data, error });

      if (error) {
        console.error('❌ Supabase function error:', error);
        throw new Error(`Image generation failed: ${error.message}`);
      }

      if (!data) {
        console.error('❌ No data returned from function');
        throw new Error('No response from image generation service');
      }

      console.log('📋 Response data structure:', {
        status: data.status,
        hasData: !!data.data,
        hasImageUrl: !!data.image_url,
        dataArray: data.data?.length
      });

      // Extract image URL from multiple possible response formats
      let imageUrl = null;
      
      if (data.status === 'success' && data.data?.[0]?.url) {
        imageUrl = data.data[0].url;
        console.log('✅ Image URL from data array:', imageUrl);
      } else if (data.image_url) {
        imageUrl = data.image_url;
        console.log('✅ Image URL from direct field:', imageUrl);
      } else if (data.data?.[0]?.url) {
        imageUrl = data.data[0].url;
        console.log('✅ Image URL from fallback:', imageUrl);
      }

      if (!imageUrl) {
        console.error('❌ No image URL found in response:', data);
        throw new Error('No image URL returned from DALL·E 3');
      }

      console.log('🖼️ Final image URL:', imageUrl);
      
      // Save to database
      await saveImageGeneration(prompt, imageUrl);
      
      console.log('✅ Image generation completed successfully');
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
      console.log('👤 User ID:', user.id);
      console.log('📝 Prompt:', prompt.substring(0, 50) + '...');
      console.log('🔗 Image URL:', imageUrl.substring(0, 50) + '...');
      
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

      console.log('✅ Image generation saved successfully:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Error saving image generation:', error);
      throw error;
    }
  };

  return {
    detectLanguage,
    isImageGenerationRequest,
    isConfirmationMessage,
    savePendingImageRequest,
    getPendingImageRequest,
    markPendingRequestCompleted,
    generateImage,
    saveImageGeneration
  };
};
