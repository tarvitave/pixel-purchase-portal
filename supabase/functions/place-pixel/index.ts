import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_PRICE_LAMPORTS = 10_000; // 0.00001 SOL

// Solana RPC endpoint - use custom RPC if configured, otherwise fallback to public
const SOLANA_RPC = (() => {
  const rpcUrlEnv = Deno.env.get('SOLANA_RPC_URL');
  if (rpcUrlEnv && /^https?:\/\//.test(rpcUrlEnv)) return rpcUrlEnv;
  return "https://api.mainnet-beta.solana.com";
})();

interface PlacePixelRequest {
  x: number;
  y: number;
  color: string;
  price_lamports: number;
  wallet: string;
  transaction_signature: string;
  network: 'mainnet-beta';
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const body: PlacePixelRequest = await req.json();
    const { x, y, color, price_lamports, wallet, transaction_signature } = body;

    console.log('Place pixel request:', { x, y, color, price_lamports, wallet, transaction_signature });

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
      // If pixel exists and is owned by someone else, require current price + base price
      if (existingPixel.owner_wallet && existingPixel.owner_wallet !== wallet) {
        requiredPrice = existingPixel.price_lamports + BASE_PRICE_LAMPORTS;
      } else if (existingPixel.owner_wallet === wallet) {
        // Owner can update their own pixel for free (just updating color)
        requiredPrice = 0;
      }
    }

    // For new purchases or outbids, validate price and verify transaction
    if (requiredPrice > 0) {
      if (price_lamports < requiredPrice) {
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

      if (!transaction_signature) {
        return new Response(
          JSON.stringify({ error: 'Transaction signature required for payment verification' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if this transaction signature has been used before
      const { data: existingTx } = await supabase
        .from('pixels')
        .select('id')
        .eq('transaction_signature', transaction_signature)
        .single();

      if (existingTx) {
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

      // Verify the actual Solana transaction
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

    // Upsert the pixel
    const pixelData = {
      x,
      y,
      color,
      owner_wallet: wallet,
      price_lamports: requiredPrice > 0 ? price_lamports : existingPixel?.price_lamports || BASE_PRICE_LAMPORTS,
      transaction_signature: transaction_signature || existingPixel?.transaction_signature,
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
