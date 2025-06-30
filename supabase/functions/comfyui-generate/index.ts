
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerationRequest {
  prompt: string
  negative_prompt?: string
  steps?: number
  cfg_scale?: number
  width?: number
  height?: number
  model_name?: string
}

interface ComfyUIWorkflow {
  [key: string]: any
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('=== ComfyUI Generate Function Called ===')
    console.log('Method:', req.method)
    console.log('URL:', req.url)
    
    // Get all headers for debugging
    const authHeader = req.headers.get('Authorization')
    const apiKeyHeader = req.headers.get('apikey')
    const clientInfoHeader = req.headers.get('x-client-info')
    
    console.log('Headers Debug:', {
      hasAuthHeader: !!authHeader,
      authHeaderPrefix: authHeader ? authHeader.substring(0, 20) + '...' : 'none',
      hasApiKey: !!apiKeyHeader,
      clientInfo: clientInfoHeader,
      authHeaderLength: authHeader?.length || 0
    })

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('Creating Supabase client...')
    
    // Create client with proper auth handling
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader || '',
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })

    console.log('Attempting user authentication...')
    
    // Try to get user with better error handling
    let user = null;
    let userError = null;
    
    try {
      const { data: userData, error: authError } = await supabaseClient.auth.getUser()
      user = userData.user;
      userError = authError;
      
      console.log('Auth getUser result:', {
        userExists: !!user,
        userId: user?.id,
        userEmail: user?.email,
        errorType: authError?.name,
        errorMessage: authError?.message,
        errorStatus: authError?.status
      })
    } catch (authException) {
      console.error('Auth exception caught:', authException)
      userError = authException;
    }

    if (userError || !user) {
      console.error('Authentication failed:', {
        error: userError,
        hasAuthHeader: !!authHeader,
        authHeaderLength: authHeader?.length || 0,
        authHeaderStart: authHeader?.substring(0, 50) || 'none'
      })
      
      return new Response(
        JSON.stringify({ 
          error: 'Authentication required',
          message: 'Please log in to use image generation',
          details: userError?.message || 'No valid session found',
          debug: {
            hasAuthHeader: !!authHeader,
            headerFormat: authHeader ? (authHeader.startsWith('Bearer ') ? 'correct' : 'incorrect') : 'missing'
          }
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('User authenticated successfully:', user.id)

    const body: GenerationRequest = await req.json()
    const {
      prompt,
      negative_prompt = '',
      steps = 20,
      cfg_scale = 7.0,
      width = 512,
      height = 512,
      model_name = 'default'
    } = body

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('Starting image generation for user:', user.id)
    console.log('Prompt:', prompt)

    // Create database record
    const { data: generationRecord, error: insertError } = await supabaseClient
      .from('image_generations')
      .insert({
        user_id: user.id,
        prompt,
        negative_prompt,
        steps,
        cfg_scale,
        width,
        height,
        model_name,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Database insert error:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create generation record', details: insertError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('Created generation record:', generationRecord.id)

    // ComfyUI configuration
    const COMFYUI_URL = Deno.env.get('COMFYUI_URL') || 'http://127.0.0.1:8188'
    console.log('ComfyUI URL:', COMFYUI_URL)
    
    // Basic workflow template for text-to-image generation
    const workflow: ComfyUIWorkflow = {
      "3": {
        "inputs": {
          "seed": Math.floor(Math.random() * 1000000),
          "steps": steps,
          "cfg": cfg_scale,
          "sampler_name": "euler",
          "scheduler": "normal",
          "denoise": 1,
          "model": ["4", 0],
          "positive": ["6", 0],
          "negative": ["7", 0],
          "latent_image": ["5", 0]
        },
        "class_type": "KSampler"
      },
      "4": {
        "inputs": {
          "ckpt_name": "v1-5-pruned-emaonly.ckpt"
        },
        "class_type": "CheckpointLoaderSimple"
      },
      "5": {
        "inputs": {
          "width": width,
          "height": height,
          "batch_size": 1
        },
        "class_type": "EmptyLatentImage"
      },
      "6": {
        "inputs": {
          "text": prompt,
          "clip": ["4", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "7": {
        "inputs": {
          "text": negative_prompt,
          "clip": ["4", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "8": {
        "inputs": {
          "samples": ["3", 0],
          "vae": ["4", 2]
        },
        "class_type": "VAEDecode"
      },
      "9": {
        "inputs": {
          "filename_prefix": "ComfyUI",
          "images": ["8", 0]
        },
        "class_type": "SaveImage"
      }
    }

    try {
      // Update status to processing
      await supabaseClient
        .from('image_generations')
        .update({ status: 'processing' })
        .eq('id', generationRecord.id)

      console.log('Sending request to ComfyUI at:', COMFYUI_URL)

      // Send prompt to ComfyUI
      const response = await fetch(`${COMFYUI_URL}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: workflow }),
      })

      if (!response.ok) {
        throw new Error(`ComfyUI request failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      console.log('ComfyUI response:', result)

      const jobId = result.prompt_id
      
      // Update with job ID
      await supabaseClient
        .from('image_generations')
        .update({ 
          comfyui_job_id: jobId,
          status: 'processing'
        })
        .eq('id', generationRecord.id)

      return new Response(
        JSON.stringify({ 
          success: true,
          generation_id: generationRecord.id,
          job_id: jobId,
          status: 'processing',
          message: 'Image generation started. Use the generation_id to check status.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )

    } catch (error) {
      console.error('ComfyUI generation error:', error)
      
      // Update status to failed
      await supabaseClient
        .from('image_generations')
        .update({ 
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', generationRecord.id)

      return new Response(
        JSON.stringify({ 
          error: 'Image generation failed',
          details: error.message,
          generation_id: generationRecord.id
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

  } catch (error) {
    console.error('Error in comfyui-generate function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
