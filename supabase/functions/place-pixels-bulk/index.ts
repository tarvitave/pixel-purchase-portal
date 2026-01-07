import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_PRICE_LAMPORTS = 100_000; // 0.0001 SOL per pixel

// Solana RPC endpoints
const SOLANA_RPC_MAINNET = "https://api.mainnet-beta.solana.com";
const SOLANA_RPC_DEVNET = "https://api.devnet.solana.com";

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
  network: 'mainnet-beta' | 'devnet';
  link_url?: string | null;
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
  network: 'mainnet-beta' | 'devnet'
): Promise<{ verified: boolean; error?: string }> {
  const rpcUrl = network === 'mainnet-beta' ? SOLANA_RPC_MAINNET : SOLANA_RPC_DEVNET;

  try {
    console.log(`Verifying transaction ${signature} on ${network}...`);
    
    let transaction: SolanaTransaction | null = null;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (!transaction && attempts < maxAttempts) {
      const response = await fetch(rpcUrl, {
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
    for (let i = 0; i < accountKeys.length; i++) {
      const key = accountKeys[i];
      const pubkeyStr = typeof key === 'string' ? key : key.pubkey;
      if (pubkeyStr === expectedSender) {
        senderIndex = i;
        break;
      }
    }

    if (senderIndex === -1) {
      return { verified: false, error: 'Sender wallet not found in transaction' };
    }

    const feePayer = accountKeys[0];
    const feePayerStr = typeof feePayer === 'string' ? feePayer : feePayer.pubkey;
    
    if (feePayerStr !== expectedSender) {
      return { verified: false, error: 'Transaction not signed by expected wallet' };
    }

    const senderBalanceChange = preBalances[senderIndex] - postBalances[senderIndex];
    
    console.log(`Sender balance change: ${senderBalanceChange} lamports (expected: ${expectedLamports})`);

    if (senderBalanceChange < expectedLamports) {
      return { 
        verified: false, 
        error: `Insufficient payment: ${senderBalanceChange} lamports paid, ${expectedLamports} required` 
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
    const { pixels, price_lamports, wallet, transaction_signature, network = 'devnet', link_url } = body;

    console.log('Bulk place pixels request:', { 
      pixelCount: pixels.length, 
      price_lamports, 
      wallet, 
      network,
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

    // Calculate required price (base price per pixel)
    const requiredPrice = pixels.length * BASE_PRICE_LAMPORTS;

    if (price_lamports < requiredPrice) {
      return new Response(
        JSON.stringify({ 
          error: `Insufficient payment. Required: ${requiredPrice} lamports for ${pixels.length} pixels`,
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

    // Verify the Solana transaction
    const verification = await verifyTransaction(
      transaction_signature,
      wallet,
      price_lamports,
      network
    );

    if (!verification.verified) {
      console.error('Transaction verification failed:', verification.error);
      return new Response(
        JSON.stringify({ error: verification.error || 'Transaction verification failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare pixel data for bulk upsert
    const pricePerPixel = Math.floor(price_lamports / pixels.length);
    const pixelData = pixels.map((pixel, index) => ({
      x: pixel.x,
      y: pixel.y,
      color: pixel.color,
      owner_wallet: wallet,
      price_lamports: pricePerPixel,
      // Only first pixel gets the transaction signature for tracking
      transaction_signature: index === 0 ? transaction_signature : null,
      link_url: link_url || null,
    }));

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
