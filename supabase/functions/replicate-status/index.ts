
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('=== Replicate Status Function Called ===')
    
    const body = await req.json()
    const { generation_id } = body

    if (!generation_id) {
      return new Response(
        JSON.stringify({ error: 'generation_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
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
          Authorization: req.headers.get('Authorization') || '',
        },
      }
    })

    // Get the generation record
    const { data: generation, error: fetchError } = await supabaseClient
      .from('image_generations')
      .select('*')
      .eq('id', generation_id)
      .single()

    if (fetchError || !generation) {
      console.error('Failed to fetch generation:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Generation not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // If already completed or failed, return current status
    if (generation.status === 'completed' || generation.status === 'failed') {
      return new Response(
        JSON.stringify({
          generation_id: generation.id,
          status: generation.status,
          image_url: generation.image_url,
          prompt: generation.prompt,
          error_message: generation.error_message,
          created_at: generation.created_at,
          completed_at: generation.completed_at
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check status with Replicate
    const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY')
    if (!REPLICATE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Replicate API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const predictionId = generation.comfyui_job_id
    if (!predictionId) {
      return new Response(
        JSON.stringify({
          generation_id: generation.id,
          status: 'processing',
          message: 'Prediction ID not available yet'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('Checking Replicate status for prediction:', predictionId)

    // Check Replicate prediction status
    const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: {
        'Authorization': `Token ${REPLICATE_API_KEY}`,
      },
    })

    if (!response.ok) {
      console.error('Replicate status check failed:', response.status)
      throw new Error(`Replicate API error: ${response.status}`)
    }

    const prediction = await response.json()
    console.log('Replicate prediction status:', prediction.status)

    let updateData = {}

    if (prediction.status === 'succeeded' && prediction.output && prediction.output.length > 0) {
      // Image generation completed successfully
      const imageUrl = prediction.output[0]
      updateData = {
        status: 'completed',
        image_url: imageUrl,
        completed_at: new Date().toISOString()
      }
      
      console.log('Image generated successfully:', imageUrl)
    } else if (prediction.status === 'failed') {
      // Image generation failed
      updateData = {
        status: 'failed',
        error_message: prediction.error || 'Generation failed',
        completed_at: new Date().toISOString()
      }
      
      console.log('Image generation failed:', prediction.error)
    } else {
      // Still processing
      console.log('Image generation still processing...')
      return new Response(
        JSON.stringify({
          generation_id: generation.id,
          status: 'processing',
          message: 'Image generation in progress...'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Update the database record
    const { error: updateError } = await supabaseClient
      .from('image_generations')
      .update(updateData)
      .eq('id', generation_id)

    if (updateError) {
      console.error('Failed to update generation:', updateError)
    }

    // Return updated status
    return new Response(
      JSON.stringify({
        generation_id: generation.id,
        status: updateData.status,
        image_url: updateData.image_url || null,
        prompt: generation.prompt,
        error_message: updateData.error_message || null,
        created_at: generation.created_at,
        completed_at: updateData.completed_at || null
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in replicate-status function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
