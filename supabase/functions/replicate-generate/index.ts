
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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  console.log('=== FUNCTION STARTED ===')
  console.log('Request method:', req.method)
  console.log('Request URL:', req.url)
  console.log('Request headers:', Object.fromEntries(req.headers.entries()))
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('=== CORS PREFLIGHT REQUEST ===')
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('=== PROCESSING POST REQUEST ===')
    
    // Get and validate authorization header
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header present:', !!authHeader)
    console.log('Auth header starts with Bearer:', authHeader?.startsWith('Bearer '))
    
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
    console.log('JWT token extracted, length:', jwtToken.length)

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    console.log('Supabase URL present:', !!supabaseUrl)
    console.log('Supabase Key present:', !!supabaseKey)
    
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

    console.log('=== VERIFYING USER AUTHENTICATION ===')
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

    console.log('=== PARSING REQUEST BODY ===')
    const body: GenerationRequest = await req.json()
    console.log('Request body received:', JSON.stringify(body, null, 2))

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
      console.error('Missing prompt in request')
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
    console.log('Requested dimensions:', width, 'x', height)

    console.log('=== CREATING DATABASE RECORD ===')
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

    console.log('=== CHECKING REPLICATE API KEY ===')
    // Get Replicate API key - Check both possible names
    const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY') || Deno.env.get('REPLICATE_API_TOKEN')
    console.log('REPLICATE_API_KEY present:', !!REPLICATE_API_KEY)
    console.log('REPLICATE_API_TOKEN present:', !!Deno.env.get('REPLICATE_API_TOKEN'))
    
    if (!REPLICATE_API_KEY) {
      console.error('REPLICATE_API_KEY not found in environment')
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

    console.log('REPLICATE_API_KEY found, length:', REPLICATE_API_KEY.length)

    try {
      console.log('=== UPDATING STATUS TO PROCESSING ===')
      // Update status to processing
      await supabaseClient
        .from('image_generations')
        .update({ status: 'processing' })
        .eq('id', generationRecord.id)

      // Prepare input payload
      let input: any = {
        prompt: prompt,
        num_outputs: 1,
        output_format: "webp",
        output_quality: 90
      }

      // Determine correct model path and settings
      let modelPath = ""
      
      if (model === 'flux_dev') {
        modelPath = "black-forest-labs/flux-dev"
        input.guidance_scale = cfg_scale
        input.num_inference_steps = steps
      } else {
        // Use flux-schnell 
        modelPath = "black-forest-labs/flux-schnell"
        input.num_inference_steps = 4
      }

      // Set aspect ratio based on dimensions
      if (width === 1024 && height === 1024) {
        input.aspect_ratio = "1:1"
      } else if (width === 1280 && height === 720) {
        input.aspect_ratio = "16:9"
      } else if (width === 720 && height === 1280) {
        input.aspect_ratio = "9:16"
      } else if (width === 1024 && height === 768) {
        input.aspect_ratio = "4:3"
      } else if (width === 768 && height === 1024) {
        input.aspect_ratio = "3:4"
      } else {
        input.aspect_ratio = "1:1"
      }

      // Add negative prompt if provided
      if (negative_prompt && negative_prompt.trim()) {
        input.negative_prompt = negative_prompt
      }

      console.log('=== REPLICATE API CALL DETAILS ===')
      console.log('Model path:', modelPath)
      console.log('Input payload:', JSON.stringify(input, null, 2))

      // Use the correct Replicate SDK structure
      const requestPayload = {
        model: modelPath,
        input: input
      }

      console.log('Final request payload to Replicate:', JSON.stringify(requestPayload, null, 2))

      // Retry logic for rate limiting
      let retryCount = 0;
      const maxRetries = 3;
      let response;

      console.log('=== CALLING REPLICATE API ===')
      while (retryCount <= maxRetries) {
        try {
          // Call Replicate REST API with SDK structure
          response = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
              'Authorization': `Token ${REPLICATE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestPayload),
          })

          console.log('=== REPLICATE API RESPONSE ===')
          console.log('Response status:', response.status)
          console.log('Response headers:', Object.fromEntries(response.headers.entries()))

          // Handle rate limiting
          if (response.status === 429) {
            const retryAfter = response.headers.get('retry-after') || response.headers.get('x-ratelimit-reset-after');
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, retryCount) * 1000;

            if (retryCount < maxRetries) {
              console.log(`Rate limited (429). Retrying in ${waitTime}ms (attempt ${retryCount + 1}/${maxRetries})`);
              await sleep(waitTime);
              retryCount++;
              continue;
            } else {
              console.error('Max retries exceeded for rate limiting');
              const errorMessage = 'Request was throttled. Please try again in a few seconds.';
              
              await supabaseClient
                .from('image_generations')
                .update({ 
                  status: 'failed',
                  error_message: errorMessage,
                  completed_at: new Date().toISOString()
                })
                .eq('id', generationRecord.id)

              return new Response(
                JSON.stringify({ 
                  error: errorMessage,
                  generation_id: generationRecord.id,
                  retry_after: waitTime / 1000
                }),
                {
                  status: 429,
                  headers: { 
                    ...corsHeaders, 
                    'Content-Type': 'application/json',
                    'Retry-After': String(waitTime / 1000)
                  },
                }
              )
            }
          }

          // If not rate limited, break out of retry loop
          break;

        } catch (fetchError) {
          console.error('Network error during API call:', fetchError);
          if (retryCount < maxRetries) {
            console.log(`Network error. Retrying in ${1000 * (retryCount + 1)}ms...`);
            await sleep(1000 * (retryCount + 1));
            retryCount++;
            continue;
          } else {
            throw fetchError;
          }
        }
      }

      const responseText = await response.text()
      console.log('Raw response text:', responseText)

      if (!response.ok && response.status !== 429) {
        console.error('=== REPLICATE API ERROR ===')
        console.error('Status:', response.status)
        console.error('Response:', responseText)
        
        // Try to parse error for more details
        try {
          const errorData = JSON.parse(responseText)
          console.error('Parsed error data:', JSON.stringify(errorData, null, 2))
        } catch (parseError) {
          console.error('Could not parse error response as JSON')
        }

        await supabaseClient
          .from('image_generations')
          .update({ 
            status: 'failed',
            error_message: `Replicate API error: ${response.status} - ${responseText}`,
            completed_at: new Date().toISOString()
          })
          .eq('id', generationRecord.id)

        return new Response(
          JSON.stringify({ 
            error: 'Replicate API error',
            details: `Status: ${response.status}, Response: ${responseText}`,
            generation_id: generationRecord.id
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      let result
      try {
        result = JSON.parse(responseText)
        console.log('=== REPLICATE SUCCESS RESPONSE ===')
        console.log('Parsed result:', JSON.stringify(result, null, 2))
      } catch (parseError) {
        console.error('Failed to parse success response:', parseError)
        throw new Error(`Failed to parse Replicate response: ${responseText}`)
      }

      const predictionId = result.id
      
      if (!predictionId) {
        console.error('No prediction ID in response:', result)
        throw new Error('No prediction ID returned from Replicate')
      }

      console.log('Prediction started with ID:', predictionId)

      // Update with prediction ID
      await supabaseClient
        .from('image_generations')
        .update({ 
          comfyui_job_id: predictionId,
          status: 'processing'
        })
        .eq('id', generationRecord.id)

      console.log('=== FUNCTION COMPLETED SUCCESSFULLY ===')
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
      console.error('=== GENERATION ERROR ===')
      console.error('Error type:', error.constructor.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      
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
    console.error('=== MAIN FUNCTION ERROR ===')
    console.error('Error type:', error.constructor.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
