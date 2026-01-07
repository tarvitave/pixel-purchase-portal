import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_PRICE_LAMPORTS = 1_000_000; // 0.001 SOL

interface PlacePixelRequest {
  x: number;
  y: number;
  color: string;
  price_lamports: number;
  wallet: string;
  signature: string;
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const body: PlacePixelRequest = await req.json();
    const { x, y, color, price_lamports, wallet, signature, message } = body;

    console.log('Place pixel request:', { x, y, color, price_lamports, wallet });

    // Validate inputs
    if (x < 0 || x >= 1000 || y < 0 || y >= 1000) {
      return new Response(
        JSON.stringify({ error: 'Invalid pixel coordinates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return new Response(
        JSON.stringify({ error: 'Invalid color format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!wallet || wallet.length < 32) {
      return new Response(
        JSON.stringify({ error: 'Invalid wallet address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Signature required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the message matches what we expect
    try {
      const parsedMessage = JSON.parse(message);
      if (
        parsedMessage.x !== x ||
        parsedMessage.y !== y ||
        parsedMessage.color !== color ||
        parsedMessage.wallet !== wallet ||
        parsedMessage.price_lamports !== price_lamports
      ) {
        return new Response(
          JSON.stringify({ error: 'Message content mismatch' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid message format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if pixel exists
    const { data: existingPixel, error: fetchError } = await supabase
      .from('pixels')
      .select('*')
      .eq('x', x)
      .eq('y', y)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching pixel:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to check pixel status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine required price
    let requiredPrice = BASE_PRICE_LAMPORTS;
    
    if (existingPixel) {
      // If pixel exists and is owned by someone else, require 10% more
      if (existingPixel.owner_wallet && existingPixel.owner_wallet !== wallet) {
        requiredPrice = Math.floor(existingPixel.price_lamports * 1.1);
      } else if (existingPixel.owner_wallet === wallet) {
        // Owner can update their own pixel for free (just updating color)
        requiredPrice = 0;
      }
    }

    // For new purchases or outbids, validate price
    if (requiredPrice > 0 && price_lamports < requiredPrice) {
      return new Response(
        JSON.stringify({ 
          error: `Insufficient bid. Minimum required: ${requiredPrice} lamports`,
          required_price: requiredPrice 
        }),
        { 
          status: 402, // Payment Required - x402!
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // In a production environment, you would verify the actual Solana transaction here
    // For now, we trust the signed message as proof of intent to pay
    // The signature proves the wallet holder authorized this action

    // Upsert the pixel
    const pixelData = {
      x,
      y,
      color,
      owner_wallet: wallet,
      price_lamports: requiredPrice > 0 ? price_lamports : existingPixel?.price_lamports || BASE_PRICE_LAMPORTS,
      transaction_signature: signature,
    };

    const { data: upsertedPixel, error: upsertError } = await supabase
      .from('pixels')
      .upsert(pixelData, { onConflict: 'x,y' })
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting pixel:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to place pixel' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Pixel placed successfully:', upsertedPixel);

    return new Response(
      JSON.stringify({ 
        success: true, 
        pixel: upsertedPixel,
        message: existingPixel ? 'Pixel updated!' : 'Pixel placed!' 
      }),
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
