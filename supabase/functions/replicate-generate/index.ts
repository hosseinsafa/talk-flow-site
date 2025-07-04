
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerationRequest {
  prompt: string
  aspect_ratio?: string
  prompt_strength?: number
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

    // Extract parameters with defaults
    const {
      prompt,
      aspect_ratio = '1:1',
      prompt_strength = 0.8
    } = requestBody

    console.log('🎨 Generation parameters:', { prompt, aspect_ratio, prompt_strength })

    // Create database record
    console.log('💾 Creating database record')
    const { data: generationRecord, error: insertError } = await supabaseClient
      .from('image_generations')
      .insert({
        user_id: user.id,
        prompt,
        model_type: 'flux-schnell',
        status: 'pending',
        width: aspect_ratio === '16:9' ? 1280 : aspect_ratio === '9:16' ? 720 : 1024,
        height: aspect_ratio === '16:9' ? 720 : aspect_ratio === '9:16' ? 1280 : 1024,
        steps: 4,
        cfg_scale: 1.0
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

      // Prepare exact request payload that matches your successful Postman test
      const replicatePayload = {
        version: "c846a69991daf4c0e5d016514849d14ee5b2e6846ce6b9d6f21369e564cfe51e",
        input: {
          prompt: prompt,
          aspect_ratio: aspect_ratio,
          prompt_strength: prompt_strength
        }
      }

      console.log('📤 Replicate API payload (exact match to successful Postman test):')
      console.log(JSON.stringify(replicatePayload, null, 2))

      // Call Replicate API with retry logic
      let retryCount = 0
      const maxRetries = 3
      let response

      while (retryCount <= maxRetries) {
        try {
          console.log(`📡 Calling Replicate API (attempt ${retryCount + 1})`)
          console.log('🔗 Endpoint: https://api.replicate.com/v1/predictions')
          console.log('🔑 Authorization: Token [REDACTED]')
          console.log('📋 Content-Type: application/json')
          
          response = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
              'Authorization': `Token ${REPLICATE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(replicatePayload),
          })

          console.log('📊 Replicate API response status:', response.status)
          console.log('📊 Replicate API response headers:', Object.fromEntries(response.headers.entries()))

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
      console.log('📥 Replicate API raw response:')
      console.log(responseText)

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
        console.log('✅ Parsed Replicate response:')
        console.log(JSON.stringify(result, null, 2))
      } catch (parseError) {
        console.error('❌ Failed to parse Replicate response:', parseError)
        throw new Error(`Failed to parse Replicate response: ${responseText}`)
      }

      const predictionId = result.id
      const predictionStatus = result.status
      const pollUrl = result.urls?.get
      
      if (!predictionId) {
        console.error('❌ No prediction ID in response:', result)
        throw new Error('No prediction ID returned from Replicate')
      }

      console.log('🎉 Prediction created successfully!')
      console.log('🆔 Prediction ID:', predictionId)
      console.log('📊 Initial status:', predictionStatus)
      console.log('🔗 Poll URL:', pollUrl)

      // Update database with prediction ID and poll URL
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
          status: predictionStatus || 'processing',
          poll_url: pollUrl,
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
