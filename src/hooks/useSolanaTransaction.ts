import { useState, useCallback, useEffect } from 'react';
import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
} from '@solana/web3.js';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Mainnet RPC endpoint - will be fetched from edge function
const DEFAULT_RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';

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
      const connection = new Connection(DEFAULT_RPC_ENDPOINT, 'confirmed');
      
      // Get the public key as a proper PublicKey object
      const fromPubkey = new PublicKey(provider.publicKey.toString());
      const toPubkey = new PublicKey(treasuryWallet);
      
      // Get the latest blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

      // Create the transfer transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports: lamports,
        })
      );

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      console.log(`Sending ${lamports} lamports to ${treasuryWallet} on mainnet...`);

      // Sign the transaction using Phantom
      const signedTransaction = await provider.signTransaction(transaction);

      // Send the signed transaction
      const signature = await connection.sendRawTransaction(
        (signedTransaction as Transaction).serialize()
      );

      console.log('Transaction sent:', signature);
      toast.info('Transaction submitted, waiting for confirmation...');

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      if (confirmation.value.err) {
        throw new Error('Transaction failed on chain');
      }

      console.log('Transaction confirmed:', signature);
      return signature;

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
