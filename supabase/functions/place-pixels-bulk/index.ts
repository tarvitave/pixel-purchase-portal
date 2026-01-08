import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_PRICE_LAMPORTS = 100_000; // 0.0001 SOL per pixel

// Solana RPC endpoint - use custom RPC if configured, otherwise fallback to public
const SOLANA_RPC = (() => {
  const rpcUrlEnv = Deno.env.get('SOLANA_RPC_URL');
  if (rpcUrlEnv && /^https?:\/\//.test(rpcUrlEnv)) return rpcUrlEnv;
  return "https://api.mainnet-beta.solana.com";
})();

interface PixelData {
  x: number;
  y: number;
  color: string;
}

interface PlacePixelsBulkRequest {
  pixels: PixelData[];
  price_lamports: number;
  wallet: string;
  transaction_signature: string;
  network: 'mainnet-beta';
  link_url?: string | null;
  include_batch_pixels?: boolean;
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
    console.log(`Expected treasury wallet: ${treasuryWallet}`);
    
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

    // Find sender and treasury indices
    let senderIndex = -1;
    let treasuryIndex = -1;
    
    for (let i = 0; i < accountKeys.length; i++) {
      const key = accountKeys[i];
      const pubkeyStr = typeof key === 'string' ? key : key.pubkey;
      if (pubkeyStr === expectedSender) {
        senderIndex = i;
      }
      if (pubkeyStr === treasuryWallet) {
        treasuryIndex = i;
      }
    }

    if (senderIndex === -1) {
      return { verified: false, error: 'Sender wallet not found in transaction' };
    }

    if (treasuryIndex === -1) {
      return { verified: false, error: 'Treasury wallet not found in transaction - payment not sent to correct address' };
    }

    const feePayer = accountKeys[0];
    const feePayerStr = typeof feePayer === 'string' ? feePayer : feePayer.pubkey;
    
    if (feePayerStr !== expectedSender) {
      return { verified: false, error: 'Transaction not signed by expected wallet' };
    }

    // Verify treasury received the funds
    const treasuryBalanceChange = postBalances[treasuryIndex] - preBalances[treasuryIndex];
    
    console.log(`Treasury balance change: ${treasuryBalanceChange} lamports (expected: ${expectedLamports})`);

    if (treasuryBalanceChange < expectedLamports) {
      return { 
        verified: false, 
        error: `Insufficient payment to treasury: ${treasuryBalanceChange} lamports received, ${expectedLamports} required` 
      };
    }

    const blockTime = transaction.blockTime;
    if (blockTime) {
      const now = Math.floor(Date.now() / 1000);
      const fiveMinutes = 5 * 60;
      
      if (now - blockTime > fiveMinutes) {
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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const body: PlacePixelsBulkRequest = await req.json();
    const { pixels, price_lamports, wallet, transaction_signature, link_url } = body;

    console.log('Bulk place pixels request:', { 
      pixelCount: pixels.length, 
      price_lamports, 
      wallet, 
      link_url: link_url ? 'provided' : 'none'
    });

    // Validate inputs
    if (!pixels || pixels.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No pixels provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (pixels.length > 10000) {
      return new Response(
        JSON.stringify({ error: 'Maximum 10,000 pixels per transaction' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate each pixel
    for (const pixel of pixels) {
      if (pixel.x < 0 || pixel.x >= 1000 || pixel.y < 0 || pixel.y >= 1000) {
        return new Response(
          JSON.stringify({ error: `Invalid pixel coordinates: (${pixel.x}, ${pixel.y})` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!/^#[0-9A-Fa-f]{6}$/.test(pixel.color)) {
        return new Response(
          JSON.stringify({ error: `Invalid color format: ${pixel.color}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!wallet || wallet.length < 32) {
      return new Response(
        JSON.stringify({ error: 'Invalid wallet address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch existing pixels to calculate required outbid prices (include color and batch_id)
    const { data: existingPixels, error: fetchError } = await supabase
      .from('pixels')
      .select('x, y, price_lamports, owner_wallet, color, batch_id')
      .or(pixels.map(p => `and(x.eq.${p.x},y.eq.${p.y})`).join(','));

    if (fetchError) {
      console.error('Error fetching existing pixels:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to check existing pixels' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build map of existing pixels
    const existingMap = new Map<string, { price_lamports: number; owner_wallet: string | null; color: string; batch_id: string | null }>();
    (existingPixels || []).forEach(p => {
      existingMap.set(`${p.x},${p.y}`, { price_lamports: p.price_lamports, owner_wallet: p.owner_wallet, color: p.color, batch_id: p.batch_id });
    });

    // Calculate required price - base for new, current + base for outbidding others
    // Own pixels are FREE to update
    let requiredPrice = 0;
    for (const pixel of pixels) {
      const existing = existingMap.get(`${pixel.x},${pixel.y}`);
      if (existing && existing.owner_wallet) {
        // Check if this pixel is owned by the current wallet
        if (existing.owner_wallet === wallet) {
          // Own pixel - FREE to update, no charge
          continue;
        }
        // Someone else's pixel - need to outbid: current price + base price (0.0001 SOL)
        requiredPrice += existing.price_lamports + BASE_PRICE_LAMPORTS;
      } else {
        // New pixel: base price
        requiredPrice += BASE_PRICE_LAMPORTS;
      }
    }

    console.log(`Required price: ${requiredPrice} lamports, provided: ${price_lamports} lamports`);

    // Only require payment if there's a cost
    if (requiredPrice > 0) {
      if (price_lamports < requiredPrice) {
        return new Response(
          JSON.stringify({ 
            error: `Insufficient payment. Required: ${requiredPrice} lamports for ${pixels.length} pixels (includes outbid premiums)`,
            required_price: requiredPrice 
          }),
          { 
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      if (!transaction_signature) {
        return new Response(
          JSON.stringify({ error: 'Transaction signature required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if transaction signature already used
      const { data: existingTx } = await supabase
        .from('pixels')
        .select('id')
        .eq('transaction_signature', transaction_signature)
        .limit(1);

      if (existingTx && existingTx.length > 0) {
        return new Response(
          JSON.stringify({ error: 'Transaction signature already used' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get treasury wallet from environment
      const treasuryWallet = Deno.env.get('TREASURY_WALLET_ADDRESS');
      if (!treasuryWallet) {
        console.error('TREASURY_WALLET_ADDRESS not configured');
        return new Response(
          JSON.stringify({ error: 'Server configuration error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Prevent user from paying to themselves (treasury cannot purchase pixels)
      if (wallet === treasuryWallet) {
        return new Response(
          JSON.stringify({ error: 'Treasury wallet cannot purchase pixels. Please use a different wallet.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify the Solana transaction
      const verification = await verifyTransaction(
        transaction_signature,
        wallet,
        price_lamports,
        treasuryWallet
      );

      if (!verification.verified) {
        console.error('Transaction verification failed:', verification.error);
        return new Response(
          JSON.stringify({ error: verification.error || 'Transaction verification failed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generate a unique batch_id for this purchase to group all pixels together
    const batchId = crypto.randomUUID();
    
    // Prepare pixel data for bulk upsert with correct prices per pixel
    const pixelData = pixels.map((pixel, index) => {
      const existing = existingMap.get(`${pixel.x},${pixel.y}`);
      const pixelPrice = existing && existing.owner_wallet
        ? existing.price_lamports + BASE_PRICE_LAMPORTS
        : BASE_PRICE_LAMPORTS;
      
      // For batch pixels being taken over, keep their existing color if placeholder was sent
      const finalColor = (pixel.color === '#000000' && existing?.color) 
        ? existing.color 
        : pixel.color;
      
      return {
        x: pixel.x,
        y: pixel.y,
        color: finalColor,
        owner_wallet: wallet,
        price_lamports: pixelPrice,
        // Only first pixel gets the transaction signature for tracking
        transaction_signature: index === 0 ? transaction_signature : null,
        link_url: link_url || null,
        batch_id: batchId,
      };
    });

    // Bulk upsert pixels
    const { error: upsertError } = await supabase
      .from('pixels')
      .upsert(pixelData, { onConflict: 'x,y' });

    if (upsertError) {
      console.error('Error upserting pixels:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to place pixels' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`${pixels.length} pixels placed successfully!`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: pixels.length,
        message: `${pixels.length} pixels placed!` 
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
