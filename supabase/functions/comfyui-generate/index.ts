
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
    
    // Get and validate authorization header
    const authHeader = req.headers.get('Authorization')
    const apiKeyHeader = req.headers.get('apikey')
    
    console.log('Auth Headers Debug:', {
      hasAuthHeader: !!authHeader,
      authHeaderPrefix: authHeader ? authHeader.substring(0, 20) + '...' : 'none',
      authHeaderLength: authHeader?.length || 0,
      startsWithBearer: authHeader ? authHeader.startsWith('Bearer ') : false,
      hasApiKey: !!apiKeyHeader
    })

    // Validate auth header format
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Invalid or missing Authorization header')
      return new Response(
        JSON.stringify({ 
          error: 'Authentication required',
          message: 'Invalid or missing Authorization header',
          details: 'Authorization header must be in format: Bearer <token>'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Extract JWT token
    const jwtToken = authHeader.replace('Bearer ', '')
    console.log('JWT Token extracted:', {
      tokenLength: jwtToken.length,
      tokenPrefix: jwtToken.substring(0, 20) + '...'
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
    
    // Create client with JWT token
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })

    console.log('Attempting to verify JWT and get user...')
    
    // Try to verify JWT token and get user
    let user = null;
    let authError = null;
    
    try {
      // Use getUser() which validates the JWT token
      const { data: userData, error } = await supabaseClient.auth.getUser(jwtToken)
      user = userData.user;
      authError = error;
      
      console.log('JWT Verification Result:', {
        userExists: !!user,
        userId: user?.id,
        userEmail: user?.email,
        errorName: error?.name,
        errorMessage: error?.message,
        errorStatus: error?.status
      })
      
    } catch (exception) {
      console.error('JWT verification exception:', {
        name: exception.name,
        message: exception.message,
        stack: exception.stack
      })
      authError = exception;
    }

    if (authError || !user) {
      console.error('Authentication failed - JWT token invalid or expired:', {
        errorType: authError?.name,
        errorMessage: authError?.message,
        tokenLength: jwtToken.length
      })
      
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed',
          message: 'Invalid or expired session token',
          details: authError?.message || 'JWT token validation failed',
          hint: 'Please log out and log back in to refresh your session'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('User authenticated successfully:', {
      userId: user.id,
      email: user.email
    })

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
