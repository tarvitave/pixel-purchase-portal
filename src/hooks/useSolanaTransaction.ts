import { useState, useCallback, useEffect } from 'react';
import {
  PublicKey,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


export type SolanaNetwork = 'mainnet-beta';

export interface UseSolanaTransactionReturn {
  sendPayment: (lamports: number) => Promise<string | null>;
  loading: boolean;
  network: SolanaNetwork;
  treasuryWallet: string | null;
}

export function useSolanaTransaction(): UseSolanaTransactionReturn {
  const [loading, setLoading] = useState(false);
  const network: SolanaNetwork = 'mainnet-beta';
  const [treasuryWallet, setTreasuryWallet] = useState<string | null>(null);

  // Fetch treasury wallet on mount
  useEffect(() => {
    const fetchTreasuryWallet = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-treasury-wallet');
        if (error) {
          console.error('Failed to fetch treasury wallet:', error);
          return;
        }
        if (data?.treasury_wallet) {
          setTreasuryWallet(data.treasury_wallet);
          console.log('Treasury wallet loaded:', data.treasury_wallet);
        }
      } catch (err) {
        console.error('Error fetching treasury wallet:', err);
      }
    };
    
    fetchTreasuryWallet();
  }, []);

  const sendPayment = useCallback(async (
    lamports: number
  ): Promise<string | null> => {
    const provider = window.solana;
    
    if (!provider?.isPhantom || !provider.publicKey) {
      toast.error('Phantom wallet not connected');
      return null;
    }

    if (!treasuryWallet) {
      toast.error('Treasury wallet not configured');
      return null;
    }

    setLoading(true);

    try {
      const fromPubkey = new PublicKey(provider.publicKey.toString());
      const toPubkey = new PublicKey(treasuryWallet);

      const callSolanaRpc = async <T,>(
        method: string,
        params: unknown[] = []
      ): Promise<T> => {
        const { data, error } = await supabase.functions.invoke('solana-rpc', {
          body: { method, params },
        });

        if (error) {
          throw new Error(error.message);
        }

        const rpc = data as { result?: T; error?: { message?: string } };

        if (rpc?.error) {
          throw new Error(rpc.error.message || 'Solana RPC error');
        }

        if (rpc?.result === undefined) {
          throw new Error('Invalid Solana RPC response');
        }

        return rpc.result;
      };

      // Check wallet balance before proceeding
      const balanceResult = await callSolanaRpc<{ value: number }>('getBalance', [
        fromPubkey.toString(),
        { commitment: 'confirmed' },
      ]);
      
      const balance = balanceResult.value;
      const estimatedFee = 5000; // ~0.000005 SOL for transaction fee
      const requiredAmount = lamports + estimatedFee;
      
      if (balance < requiredAmount) {
        const balanceSol = (balance / 1_000_000_000).toFixed(4);
        const requiredSol = (requiredAmount / 1_000_000_000).toFixed(4);
        const shortfallSol = ((requiredAmount - balance) / 1_000_000_000).toFixed(4);
        toast.error(
          `Insufficient balance: You have ${balanceSol} SOL but need ${requiredSol} SOL. Please add ${shortfallSol} SOL to your wallet.`
        );
        setLoading(false);
        return null;
      }

      const latest = await callSolanaRpc<{
        value: { blockhash: string; lastValidBlockHeight: number };
      }>('getLatestBlockhash', [{ commitment: 'confirmed' }]);

      const blockhash = latest.value.blockhash;

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports,
        })
      );

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      console.log(`Sending ${lamports} lamports to ${treasuryWallet} on mainnet...`);

      const signedTransaction = await provider.signTransaction(transaction);
      const raw = (signedTransaction as Transaction).serialize();
      const rawBase64 = bytesToBase64(raw);

      const signature = await callSolanaRpc<string>('sendTransaction', [
        rawBase64,
        { encoding: 'base64', preflightCommitment: 'confirmed' },
      ]);

      console.log('Transaction sent:', signature);
      toast.info('Transaction submitted, waiting for confirmation...');

      const start = Date.now();
      const timeoutMs = 60_000;

      while (Date.now() - start < timeoutMs) {
        const statuses = await callSolanaRpc<{
          value: Array<{ confirmationStatus?: string; err?: unknown } | null>;
        }>('getSignatureStatuses', [[signature], { searchTransactionHistory: true }]);

        const status = statuses.value?.[0];

        if (status?.err) {
          throw new Error('Transaction failed on chain');
        }

        if (
          status?.confirmationStatus === 'confirmed' ||
          status?.confirmationStatus === 'finalized'
        ) {
          console.log('Transaction confirmed:', signature);
          return signature;
        }

        await sleep(1500);
      }

      throw new Error('Timed out waiting for confirmation');

    } catch (error) {
      console.error('Transaction error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          toast.error('Transaction cancelled by user');
        } else {
          toast.error(`Transaction error: ${error.message}`);
        }
      } else {
        toast.error('Failed to send transaction');
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [treasuryWallet]);

  return {
    sendPayment,
    loading,
    network,
    treasuryWallet,
  };
}
