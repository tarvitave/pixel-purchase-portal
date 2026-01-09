import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_PRICE_PER_PIXEL = 1_000; // 0.000001 SOL per pixel

const SOLANA_RPC = (() => {
  const rpcUrlEnv = Deno.env.get('SOLANA_RPC_URL');
  if (rpcUrlEnv && /^https?:\/\//.test(rpcUrlEnv)) return rpcUrlEnv;
  return "https://api.mainnet-beta.solana.com";
})();

interface PlaceImageRequest {
  x: number;
  y: number;
  width: number;
  height: number;
  image_base64: string;
  link_url?: string | null;
  price_lamports: number;
  wallet: string;
  transaction_signature: string;
}

interface SolanaTransaction {
  blockTime: number | null;
  meta: {
    err: unknown;
    preBalances: number[];
    postBalances: number[];
  } | null;
  transaction: {
    message: {
      accountKeys: Array<string | { pubkey: string }>;
    };
  };
}

async function verifyTransaction(
  signature: string,
  expectedSender: string,
  expectedLamports: number,
  treasuryWallet: string
): Promise<{ verified: boolean; error?: string }> {
  try {
    console.log(`Verifying transaction ${signature} on mainnet...`);
    
    let transaction: SolanaTransaction | null = null;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (!transaction && attempts < maxAttempts) {
      const response = await fetch(SOLANA_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTransaction',
          params: [
            signature,
            { encoding: 'jsonParsed', commitment: 'confirmed', maxSupportedTransactionVersion: 0 }
          ],
        }),
      });

      const result = await response.json();
      
      if (result.result) {
        transaction = result.result;
      } else {
        attempts++;
        console.log(`Transaction not found, attempt ${attempts}/${maxAttempts}...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (!transaction) {
      return { verified: false, error: 'Transaction not found on chain' };
    }

    if (transaction.meta?.err) {
      return { verified: false, error: 'Transaction failed on chain' };
    }

    const preBalances = transaction.meta?.preBalances || [];
    const postBalances = transaction.meta?.postBalances || [];
    const accountKeys = transaction.transaction.message.accountKeys;

    let senderIndex = -1;
    let treasuryIndex = -1;
    
    for (let i = 0; i < accountKeys.length; i++) {
      const key = accountKeys[i];
      const pubkeyStr = typeof key === 'string' ? key : key.pubkey;
      if (pubkeyStr === expectedSender) senderIndex = i;
      if (pubkeyStr === treasuryWallet) treasuryIndex = i;
    }

    if (senderIndex === -1) {
      return { verified: false, error: 'Sender wallet not found in transaction' };
    }

    if (treasuryIndex === -1) {
      return { verified: false, error: 'Treasury wallet not found in transaction' };
    }

    const feePayer = accountKeys[0];
    const feePayerStr = typeof feePayer === 'string' ? feePayer : feePayer.pubkey;
    
    if (feePayerStr !== expectedSender) {
      return { verified: false, error: 'Transaction not signed by expected wallet' };
    }

    const treasuryBalanceChange = postBalances[treasuryIndex] - preBalances[treasuryIndex];
    
    console.log(`Treasury balance change: ${treasuryBalanceChange} lamports (expected: ${expectedLamports})`);

    if (treasuryBalanceChange < expectedLamports) {
      return { 
        verified: false, 
        error: `Insufficient payment: ${treasuryBalanceChange} lamports received, ${expectedLamports} required` 
      };
    }

    const blockTime = transaction.blockTime;
    if (blockTime) {
      const now = Math.floor(Date.now() / 1000);
      if (now - blockTime > 5 * 60) {
        return { verified: false, error: 'Transaction is too old (more than 5 minutes)' };
      }
    }

    console.log('Transaction verified successfully!');
    return { verified: true };
  } catch (error) {
    console.error('Error verifying transaction:', error);
    return { verified: false, error: `Verification error: ${(error as Error).message}` };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const treasuryWallet = Deno.env.get('TREASURY_WALLET_ADDRESS');
    
    if (!treasuryWallet) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const body: PlaceImageRequest = await req.json();
    const { x, y, width, height, image_base64, link_url, price_lamports, wallet, transaction_signature } = body;

    console.log('Place image request:', { x, y, width, height, wallet, price_lamports });

    // Validate bounds
    if (x < 0 || y < 0 || x + width > 1000 || y + height > 1000) {
      return new Response(
        JSON.stringify({ error: 'Image placement out of bounds (canvas is 1000x1000)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (width <= 0 || height <= 0 || width > 1000 || height > 1000) {
      return new Response(
        JSON.stringify({ error: 'Invalid image dimensions' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate required price based on area and any existing placements
    const pixelCount = width * height;
    let requiredPrice = pixelCount * BASE_PRICE_PER_PIXEL;

    // Check for overlapping placements that need to be outbid
    const { data: overlapping } = await supabase
      .from('image_placements')
      .select('id, x, y, width, height, price_lamports, owner_wallet')
      .or(`and(x.lt.${x + width},x.gte.${x - 1000}),and(y.lt.${y + height},y.gte.${y - 1000})`);

    const overlappingPlacements = (overlapping || []).filter(p => {
      const overlapX = Math.max(x, p.x) < Math.min(x + width, p.x + p.width);
      const overlapY = Math.max(y, p.y) < Math.min(y + height, p.y + p.height);
      return overlapX && overlapY && p.owner_wallet !== wallet;
    });

    // Add outbid premiums
    for (const placement of overlappingPlacements) {
      requiredPrice += Number(placement.price_lamports);
    }

    console.log(`Required price: ${requiredPrice} lamports (${pixelCount} pixels + ${overlappingPlacements.length} outbids)`);

    if (price_lamports < requiredPrice) {
      return new Response(
        JSON.stringify({ 
          error: `Insufficient payment. Required: ${requiredPrice} lamports`,
          required_price: requiredPrice 
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (wallet === treasuryWallet) {
      return new Response(
        JSON.stringify({ error: 'Treasury wallet cannot purchase' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if transaction already used
    const { data: existingTx } = await supabase
      .from('image_placements')
      .select('id')
      .eq('transaction_signature', transaction_signature)
      .limit(1);

    if (existingTx && existingTx.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Transaction signature already used' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify transaction
    const verification = await verifyTransaction(transaction_signature, wallet, price_lamports, treasuryWallet);
    if (!verification.verified) {
      return new Response(
        JSON.stringify({ error: verification.error || 'Transaction verification failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upload image to storage
    const imageData = image_base64.replace(/^data:image\/\w+;base64,/, '');
    const imageBytes = Uint8Array.from(atob(imageData), c => c.charCodeAt(0));
    const fileName = `${crypto.randomUUID()}.png`;

    const { error: uploadError } = await supabase.storage
      .from('canvas-images')
      .upload(fileName, imageBytes, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { publicUrl } } = supabase.storage
      .from('canvas-images')
      .getPublicUrl(fileName);

    // Delete overlapping placements owned by others
    if (overlappingPlacements.length > 0) {
      const { error: deleteError } = await supabase
        .from('image_placements')
        .delete()
        .in('id', overlappingPlacements.map(p => p.id));

      if (deleteError) {
        console.error('Error deleting overlapping placements:', deleteError);
      }
    }

    // Insert new placement
    const { error: insertError } = await supabase
      .from('image_placements')
      .insert({
        x,
        y,
        width,
        height,
        image_url: publicUrl,
        link_url: link_url || null,
        owner_wallet: wallet,
        price_lamports: requiredPrice,
        transaction_signature
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save placement' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Image placed successfully at (${x}, ${y}) - ${width}x${height}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        image_url: publicUrl,
        message: `Image placed at (${x}, ${y})!` 
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
