
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, model = 'gpt-4o', max_tokens = 2000, temperature = 0.7 } = await req.json();

    console.log('Streaming chat request:', { model, messages_count: messages?.length });

    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      throw new Error('OpenAI API key not configured');
    }

    // System prompt for consistent friendly tone
    const systemMessage = {
      role: 'system',
      content: 'You are ChatGPT, a helpful AI assistant created by OpenAI. You are friendly, clear, and conversational. Provide helpful, accurate responses while maintaining a natural conversation flow. You can communicate in any language the user prefers.'
    };

    const allMessages = [systemMessage, ...messages];

    console.log('Making request to OpenAI with messages:', allMessages.length);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: allMessages,
        max_tokens: max_tokens,
        temperature: temperature,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    console.log('OpenAI response received, starting stream processing');

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          console.error('No reader available from response body');
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              console.log('Stream reading completed');
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              break;
            }

            // Decode the chunk and log it
            const chunk = decoder.decode(value, { stream: true });
            console.log('Raw chunk received:', chunk.substring(0, 100) + '...');
            
            // Forward the chunk as-is
            controller.enqueue(encoder.encode(chunk));
          }
        } catch (error) {
          console.error('Stream processing error:', error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in streaming-chat function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});
