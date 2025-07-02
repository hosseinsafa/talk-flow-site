
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  console.log('=== Streaming chat request received ===');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, model = 'gpt-4o', max_tokens = 2000, temperature = 0.7 } = await req.json();

    console.log('Request details:', {
      model,
      messages_count: messages?.length,
      first_message: messages?.[0]?.content?.substring(0, 100)
    });

    if (!openAIApiKey) {
      console.error('❌ OpenAI API key not configured');
      throw new Error('OpenAI API key not configured');
    }

    if (!messages || !Array.isArray(messages)) {
      console.error('❌ Invalid messages format:', messages);
      throw new Error('Messages must be an array');
    }

    // Updated system prompt to handle image generation naturally like ChatGPT
    const systemMessage = {
      role: 'system',
      content: `You are ChatGPT, an AI assistant created by OpenAI. You are helpful, harmless, and honest. You can communicate fluently in any language the user prefers, especially Persian and English.

IMPORTANT: You have full image generation capabilities using DALL·E 3. When users request images:
- Respond naturally and directly generate the image
- Do NOT ask for confirmation or permission
- Simply acknowledge the request and indicate you're generating the image
- Use the same conversational tone as regular ChatGPT

For Persian users:
- Respond entirely in Persian when they write in Persian
- For image requests in Persian, respond like: "در حال ساخت تصویر [description] برای شما..." 

For English users:
- Respond in English when they write in English  
- For image requests, respond like: "I'll generate an image of [description] for you..."

Be conversational, helpful, and act exactly like the real ChatGPT with image generation capabilities.`
    };

    const allMessages = [systemMessage, ...messages];

    console.log('🚀 Making request to OpenAI API...');

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
      console.error('❌ OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    console.log('✅ OpenAI response received, status:', response.status);

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        console.log('📡 Starting stream processing...');
        
        const reader = response.body?.getReader();
        if (!reader) {
          console.error('❌ No reader available from response body');
          controller.enqueue(encoder.encode('data: {"error": "No reader available"}\n\n'));
          controller.close();
          return;
        }

        try {
          let buffer = '';
          
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              console.log('✅ Stream reading completed');
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              break;
            }

            // Decode the chunk
            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            
            // Process complete lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer
            
            for (const line of lines) {
              if (line.trim() === '') continue;
              
              console.log('📨 Processing line:', line.substring(0, 100) + '...');
              
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                
                if (data === '[DONE]') {
                  console.log('🏁 Received [DONE] signal');
                  controller.enqueue(encoder.encode(`${line}\n\n`));
                  continue;
                }
                
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  
                  if (content) {
                    console.log('💬 Content chunk:', content);
                  }
                  
                  // Forward the complete line
                  controller.enqueue(encoder.encode(`${line}\n\n`));
                } catch (parseError) {
                  // Some lines might not be JSON, forward them anyway
                  controller.enqueue(encoder.encode(`${line}\n\n`));
                }
              } else {
                // Forward non-data lines as well
                controller.enqueue(encoder.encode(`${line}\n\n`));
              }
            }
          }
          
          // Process any remaining buffer
          if (buffer.trim()) {
            console.log('📦 Processing remaining buffer:', buffer);
            controller.enqueue(encoder.encode(`${buffer}\n\n`));
          }
          
        } catch (error) {
          console.error('❌ Stream processing error:', error);
          controller.enqueue(encoder.encode(`data: {"error": "${error.message}"}\n\n`));
          controller.close();
        }
      }
    });

    console.log('✅ Returning streaming response');

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('❌ Error in streaming-chat function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check the function logs for more information'
      }),
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
