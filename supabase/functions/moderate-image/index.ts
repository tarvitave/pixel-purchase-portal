import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Content moderation using Lovable AI
async function moderateImage(imageBase64: string): Promise<{ 
  safe: boolean; 
  reason?: string;
}> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    console.warn('LOVABLE_API_KEY not set, skipping moderation');
    return { safe: true };
  }

  try {
    console.log('Moderating image content...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this image for content moderation. Check if it contains ANY of the following prohibited content:
1. Adult/sexual content (nudity, pornography, sexually suggestive)
2. Violence (gore, weapons being used violently, graphic injuries)
3. Hate symbols (nazi symbols, KKK imagery, extremist/hate group content)
4. Illegal content (drug use, weapons for sale)
5. Graphic or disturbing content

You MUST respond with ONLY a valid JSON object, nothing else:
If the image is safe and appropriate: {"safe": true}
If the image contains prohibited content: {"safe": false, "reason": "brief 5-word explanation"}`
            },
            {
              type: 'image_url',
              image_url: { url: imageBase64 }
            }
          ]
        }],
      }),
    });

    if (!response.ok) {
      console.error('Moderation API error:', response.status);
      // Fail open - allow if moderation service is unavailable
      return { safe: true };
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    
    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('Moderation result:', parsed);
      return {
        safe: parsed.safe === true,
        reason: parsed.reason,
      };
    }
    
    // If we can't parse, assume safe
    console.warn('Could not parse moderation response:', content);
    return { safe: true };
  } catch (error) {
    console.error('Moderation error:', error);
    // Fail open - allow if moderation fails
    return { safe: true };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image_base64 } = await req.json();

    if (!image_base64) {
      return new Response(
        JSON.stringify({ error: 'image_base64 is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await moderateImage(image_base64);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
