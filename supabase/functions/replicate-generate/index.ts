
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
  model: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('=== Replicate Generate Function Called ===')
    
    // Get and validate authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Invalid or missing Authorization header')
      return new Response(
        JSON.stringify({ 
          error: 'Authentication required',
          message: 'Invalid or missing Authorization header'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Extract JWT token
    const jwtToken = authHeader.replace('Bearer ', '')

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

    // Verify JWT token and get user
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(jwtToken)
    
    if (authError || !userData.user) {
      console.error('Authentication failed:', authError)
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed',
          message: 'Invalid or expired session token'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const user = userData.user
    console.log('User authenticated successfully:', user.id)

    const body: GenerationRequest = await req.json()
    const {
      prompt,
      negative_prompt = '',
      steps = 4,
      cfg_scale = 1.0,
      width = 1024,
      height = 1024,
      model
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
    console.log('Model:', model)
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
        model_type: model,
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

    // Get Replicate API key
    const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY')
    if (!REPLICATE_API_KEY) {
      await supabaseClient
        .from('image_generations')
        .update({ 
          status: 'failed',
          error_message: 'Replicate API key not configured',
          completed_at: new Date().toISOString()
        })
        .eq('id', generationRecord.id)

      return new Response(
        JSON.stringify({ 
          error: 'Replicate API key not configured',
          generation_id: generationRecord.id
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    try {
      // Update status to processing
      await supabaseClient
        .from('image_generations')
        .update({ status: 'processing' })
        .eq('id', generationRecord.id)

      // Determine Replicate model based on selected model
      let replicateModel = "black-forest-labs/flux-schnell"
      if (model === 'flux_dev') {
        replicateModel = "black-forest-labs/flux-dev"
      }

      console.log('Using Replicate model:', replicateModel)

      // Prepare input for Replicate
      const input = {
        prompt: prompt,
        width: width,
        height: height,
        num_outputs: 1,
        output_format: "webp",
        output_quality: 90
      }

      // Add model-specific parameters
      if (model === 'flux_dev') {
        input.guidance_scale = cfg_scale
        input.num_inference_steps = steps
      } else {
        // Flux Schnell has fixed parameters
        input.num_inference_steps = 4
      }

      // Add negative prompt if provided
      if (negative_prompt) {
        input.negative_prompt = negative_prompt
      }

      console.log('Replicate input:', input)

      // Call Replicate API
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${REPLICATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: replicateModel,
          input: input
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Replicate API error:', response.status, errorText)
        throw new Error(`Replicate API error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      console.log('Replicate response:', result)

      const predictionId = result.id
      
      // Update with prediction ID
      await supabaseClient
        .from('image_generations')
        .update({ 
          comfyui_job_id: predictionId,
          status: 'processing'
        })
        .eq('id', generationRecord.id)

      return new Response(
        JSON.stringify({ 
          success: true,
          generation_id: generationRecord.id,
          prediction_id: predictionId,
          status: 'processing',
          message: 'Image generation started. Use the generation_id to check status.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )

    } catch (error) {
      console.error('Replicate generation error:', error)
      
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
    console.error('Error in replicate-generate function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
