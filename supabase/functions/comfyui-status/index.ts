
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user from JWT token
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const { generation_id } = await req.json()

    if (!generation_id) {
      return new Response(
        JSON.stringify({ error: 'generation_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get generation record
    const { data: generation, error: fetchError } = await supabaseClient
      .from('image_generations')
      .select('*')
      .eq('id', generation_id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !generation) {
      return new Response(
        JSON.stringify({ error: 'Generation not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // If already completed or failed, return the current status
    if (generation.status === 'completed' || generation.status === 'failed') {
      return new Response(
        JSON.stringify(generation),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check ComfyUI status
    const COMFYUI_URL = Deno.env.get('COMFYUI_URL') || 'http://127.0.0.1:8188'
    
    try {
      const statusResponse = await fetch(`${COMFYUI_URL}/history/${generation.comfyui_job_id}`)
      
      if (statusResponse.ok) {
        const historyData = await statusResponse.json()
        
        if (historyData[generation.comfyui_job_id]) {
          const jobData = historyData[generation.comfyui_job_id]
          
          // Job is completed
          if (jobData.status?.completed) {
            // Extract image URL from outputs
            const outputs = jobData.outputs
            let imageUrl = null
            
            // Look for SaveImage outputs
            for (const nodeId in outputs) {
              if (outputs[nodeId].images && outputs[nodeId].images.length > 0) {
                const image = outputs[nodeId].images[0]
                imageUrl = `${COMFYUI_URL}/view?filename=${image.filename}&subfolder=${image.subfolder || ''}&type=${image.type || 'output'}`
                break
              }
            }
            
            // Update database record
            const { data: updatedGeneration } = await supabaseClient
              .from('image_generations')
              .update({
                status: 'completed',
                image_url: imageUrl,
                completed_at: new Date().toISOString()
              })
              .eq('id', generation_id)
              .select()
              .single()
            
            return new Response(
              JSON.stringify(updatedGeneration),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            )
          }
        }
      }
      
      // Still processing
      return new Response(
        JSON.stringify({ ...generation, status: 'processing' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
      
    } catch (error) {
      console.error('Error checking ComfyUI status:', error)
      
      // Mark as failed
      const { data: failedGeneration } = await supabaseClient
        .from('image_generations')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', generation_id)
        .select()
        .single()
      
      return new Response(
        JSON.stringify(failedGeneration),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

  } catch (error) {
    console.error('Error in comfyui-status function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
