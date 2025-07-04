
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerationRequest {
  prompt: string
  model: string
  aspect_ratio?: string
  guidance_scale?: number
  num_inference_steps?: number
}

// Replicate model version IDs
const MODEL_VERSIONS = {
  'flux_schnell': 'f2ab8a5569070ad749f0c6ded6fcb7f70aa4aa370c88c7b13b3b42b3e2c7c9fb',
  'flux_dev': '362f78965670d5c91c4084b3e52398969c87b3b01b3a2b0e6c7f9e6afd98b69b'
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  console.log('🚀 === REPLICATE GENERATE FUNCTION STARTED ===')
  console.log('Request method:', req.method)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request')
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse request body
    const requestBody: GenerationRequest = await req.json()
    console.log('📝 Request received:', JSON.stringify(requestBody, null, 2))

    // Validate required fields
    if (!requestBody.prompt) {
      console.error('❌ Missing prompt in request')
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!requestBody.model || !MODEL_VERSIONS[requestBody.model as keyof typeof MODEL_VERSIONS]) {
      console.error('❌ Invalid model specified:', requestBody.model)
      return new Response(
        JSON.stringify({ error: 'Valid model is required (flux_schnell or flux_dev)' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get and validate authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Invalid or missing Authorization header')
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

    // Extract JWT token and create Supabase client
    const jwtToken = authHeader.replace('Bearer ', '')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase configuration')
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
    console.log('🔐 Verifying user authentication')
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(jwtToken)
    
    if (authError || !userData.user) {
      console.error('❌ Authentication failed:', authError)
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
    console.log('✅ User authenticated successfully:', user.id)

    // Extract parameters
    const {
      prompt,
      model,
      aspect_ratio = '1:1',
      guidance_scale,
      num_inference_steps
    } = requestBody

    console.log('🎨 Generation parameters:', { prompt, model, aspect_ratio, guidance_scale, num_inference_steps })

    // Create database record
    console.log('💾 Creating database record')
    const { data: generationRecord, error: insertError } = await supabaseClient
      .from('image_generations')
      .insert({
        user_id: user.id,
        prompt,
        model_type: model,
        status: 'pending',
        width: aspect_ratio === '16:9' ? 1280 : aspect_ratio === '9:16' ? 720 : 1024,
        height: aspect_ratio === '16:9' ? 720 : aspect_ratio === '9:16' ? 1280 : 1024,
        steps: model === 'flux_schnell' ? 4 : (num_inference_steps || 50),
        cfg_scale: model === 'flux_schnell' ? 1.0 : (guidance_scale || 3.5)
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Database insert error:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create generation record', details: insertError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('✅ Created generation record:', generationRecord.id)

    // Get Replicate API key
    const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY')
    if (!REPLICATE_API_KEY) {
      console.error('❌ REPLICATE_API_KEY not found')
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

      // Get model version ID
      const versionId = MODEL_VERSIONS[model as keyof typeof MODEL_VERSIONS]
      console.log('🤖 Using model version:', versionId)

      // Prepare input for Replicate API
      const input: any = {
        prompt: prompt,
        aspect_ratio: aspect_ratio,
        output_format: "webp",
        output_quality: 90
      }

      // Add model-specific parameters
      if (model === 'flux_dev') {
        input.guidance_scale = guidance_scale || 3.5
        input.num_inference_steps = num_inference_steps || 50
      } else {
        // Flux Schnell always uses 4 steps
        input.num_inference_steps = 4
      }

      // Prepare Replicate API payload - ONLY version and input
      const replicatePayload = {
        version: versionId,
        input: input
      }

      console.log('📤 Replicate API payload:', JSON.stringify(replicatePayload, null, 2))

      // Call Replicate API with retry logic
      let retryCount = 0
      const maxRetries = 3
      let response

      while (retryCount <= maxRetries) {
        try {
          console.log(`📡 Calling Replicate API (attempt ${retryCount + 1})`)
          response = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
              'Authorization': `Token ${REPLICATE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(replicatePayload),
          })

          console.log('📊 Replicate API response status:', response.status)

          // Handle rate limiting
          if (response.status === 429) {
            const retryAfter = response.headers.get('retry-after') || response.headers.get('x-ratelimit-reset-after')
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, retryCount) * 1000

            if (retryCount < maxRetries) {
              console.log(`⏳ Rate limited. Retrying in ${waitTime}ms (attempt ${retryCount + 1}/${maxRetries})`)
              await sleep(waitTime)
              retryCount++
              continue
            } else {
              console.error('❌ Max retries exceeded for rate limiting')
              const errorMessage = 'Request was throttled. Please try again in a few seconds.'
              
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
          break

        } catch (fetchError) {
          console.error('❌ Network error during API call:', fetchError)
          if (retryCount < maxRetries) {
            console.log(`🔄 Network error. Retrying in ${1000 * (retryCount + 1)}ms...`)
            await sleep(1000 * (retryCount + 1))
            retryCount++
            continue
          } else {
            throw fetchError
          }
        }
      }

      const responseText = await response.text()
      console.log('📥 Replicate API raw response:', responseText)

      if (!response.ok) {
        console.error('❌ Replicate API error:', response.status, responseText)
        
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
        console.log('✅ Parsed Replicate response:', JSON.stringify(result, null, 2))
      } catch (parseError) {
        console.error('❌ Failed to parse Replicate response:', parseError)
        throw new Error(`Failed to parse Replicate response: ${responseText}`)
      }

      const predictionId = result.id
      
      if (!predictionId) {
        console.error('❌ No prediction ID in response:', result)
        throw new Error('No prediction ID returned from Replicate')
      }

      console.log('🎉 Prediction started successfully with ID:', predictionId)

      // Update database with prediction ID
      await supabaseClient
        .from('image_generations')
        .update({ 
          comfyui_job_id: predictionId,
          status: 'processing'
        })
        .eq('id', generationRecord.id)

      console.log('✅ === FUNCTION COMPLETED SUCCESSFULLY ===')
      return new Response(
        JSON.stringify({ 
          success: true,
          generation_id: generationRecord.id,
          prediction_id: predictionId,
          status: 'processing',
          message: 'Image generation started successfully. Use the generation_id to check status.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )

    } catch (error) {
      console.error('❌ Generation error:', error)
      
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
    console.error('❌ Main function error:', error)
    
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
