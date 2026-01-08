import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type RpcRequestBody = {
  method?: string;
  params?: unknown[];
};

const ALLOWED_METHODS = new Set([
  'getBalance',
  'getLatestBlockhash',
  'sendTransaction',
  'getSignatureStatuses',
]);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as RpcRequestBody;
    const method = body?.method;
    const params = Array.isArray(body?.params) ? body.params : [];

    if (!method || typeof method !== 'string') {
      return new Response(
        JSON.stringify({ error: { message: 'Missing method' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!ALLOWED_METHODS.has(method)) {
      return new Response(
        JSON.stringify({ error: { message: `Method not allowed: ${method}` } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const rpcUrlEnv = Deno.env.get('SOLANA_RPC_URL');
    const rpcUrl = rpcUrlEnv && /^https?:\/\//.test(rpcUrlEnv)
      ? rpcUrlEnv
      : "https://api.mainnet-beta.solana.com";

    const rpcRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
    });

    const json = await rpcRes.json();

    return new Response(
      JSON.stringify(json),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('solana-rpc error:', error);
    return new Response(
      JSON.stringify({ error: { message: (error as Error).message || 'Unknown error' } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
