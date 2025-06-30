
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StatusRequest {
  generation_id: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('=== ComfyUI Status Function Called ===')
    console.log('Method:', req.method)
    
    // Check for authorization header
    const authHeader = req.headers.get('Authorization')
    console.log('Authorization header present:', !!authHeader)

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader ?? '' },
        },
      }
    )

    // Get user from JWT token
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    console.log('User authentication result:', {
      userExists: !!user,
      userId: user?.id,
      error: userError?.message
    })

    if (userError || !user) {
      console.error('Authentication failed:', userError)
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized',
          details: userError?.message || 'No user found'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const body: StatusRequest = await req.json()
    const { generation_id } = body

    if (!generation_id) {
      return new Response(
        JSON.stringify({ error: 'Generation ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('Checking status for generation:', generation_id)

    // Get generation record from database
    const { data: generation, error: fetchError } = await supabaseClient
      .from('image_generations')
      .select('*')
      .eq('id', generation_id)
      .eq('user_id', user.id) // Ensure user can only access their own generations
      .single()

    if (fetchError) {
      console.error('Database fetch error:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Generation not found', details: fetchError.message }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('Generation status:', generation.status)

    // If already completed or failed, return current status
    if (generation.status === 'completed' || generation.status === 'failed') {
      return new Response(
        JSON.stringify({
          id: generation.id,
          status: generation.status,
          prompt: generation.prompt,
          image_url: generation.image_url,
          created_at: generation.created_at,
          completed_at: generation.completed_at,
          error_message: generation.error_message
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // If still processing, check ComfyUI status
    if (generation.status === 'processing' && generation.comfyui_job_id) {
      const COMFYUI_URL = Deno.env.get('COMFYUI_URL') || 'http://127.0.0.1:8188'
      
      try {
        console.log('Checking ComfyUI status for job:', generation.comfyui_job_id)
        
        // Check if job is complete
        const historyResponse = await fetch(`${COMFYUI_URL}/history/${generation.comfyui_job_id}`)
        
        if (historyResponse.ok) {
          const historyData = await historyResponse.json()
          console.log('ComfyUI history response:', historyData)
          
          if (historyData[generation.comfyui_job_id]) {
            const jobData = historyData[generation.comfyui_job_id]
            
            // Job is complete, get the output images
            if (jobData.outputs) {
              // Find the SaveImage node output (usually node "9")
              const saveImageOutput = jobData.outputs["9"]
              if (saveImageOutput && saveImageOutput.images && saveImageOutput.images.length > 0) {
                const imageInfo = saveImageOutput.images[0]
                const imageUrl = `${COMFYUI_URL}/view?filename=${imageInfo.filename}&subfolder=${imageInfo.subfolder || ''}&type=${imageInfo.type || 'output'}`
                
                console.log('Image generated successfully:', imageUrl)
                
                // Update database with completed status and image URL
                await supabaseClient
                  .from('image_generations')
                  .update({
                    status: 'completed',
                    image_url: imageUrl,
                    completed_at: new Date().toISOString()
                  })
                  .eq('id', generation_id)

                return new Response(
                  JSON.stringify({
                    id: generation.id,
                    status: 'completed',
                    prompt: generation.prompt,
                    image_url: imageUrl,
                    created_at: generation.created_at,
                    completed_at: new Date().toISOString()
                  }),
                  {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  }
                )
              }
            }
          }
        }
        
        // Still processing or error occurred
        return new Response(
          JSON.stringify({
            id: generation.id,
            status: generation.status,
            prompt: generation.prompt,
            created_at: generation.created_at,
            message: 'Still processing...'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
        
      } catch (comfyError) {
        console.error('ComfyUI status check error:', comfyError)
        
        // Update status to failed
        await supabaseClient
          .from('image_generations')
          .update({
            status: 'failed',
            error_message: `ComfyUI status check failed: ${comfyError.message}`,
            completed_at: new Date().toISOString()
          })
          .eq('id', generation_id)

        return new Response(
          JSON.stringify({
            id: generation.id,
            status: 'failed',
            prompt: generation.prompt,
            error_message: `ComfyUI status check failed: ${comfyError.message}`,
            created_at: generation.created_at,
            completed_at: new Date().toISOString()
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // Default return current status
    return new Response(
      JSON.stringify({
        id: generation.id,
        status: generation.status,
        prompt: generation.prompt,
        created_at: generation.created_at
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

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
