import { useState, useCallback } from 'react';
import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
} from '@solana/web3.js';
import { toast } from 'sonner';

// Treasury wallet to receive payments - this should match the backend
const TREASURY_WALLET = new PublicKey("11111111111111111111111111111111");

// RPC endpoints
const RPC_ENDPOINTS = {
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  'devnet': 'https://api.devnet.solana.com',
};

export type SolanaNetwork = 'mainnet-beta' | 'devnet';

export interface UseSolanaTransactionReturn {
  sendPayment: (lamports: number, network?: SolanaNetwork) => Promise<string | null>;
  loading: boolean;
  network: SolanaNetwork;
  setNetwork: (network: SolanaNetwork) => void;
}

export function useSolanaTransaction(): UseSolanaTransactionReturn {
  const [loading, setLoading] = useState(false);
  const [network, setNetwork] = useState<SolanaNetwork>('devnet');

  const sendPayment = useCallback(async (
    lamports: number, 
    targetNetwork: SolanaNetwork = network
  ): Promise<string | null> => {
    const provider = window.solana;
    
    if (!provider?.isPhantom || !provider.publicKey) {
      toast.error('Phantom wallet not connected');
      return null;
    }

    setLoading(true);

    try {
      const connection = new Connection(RPC_ENDPOINTS[targetNetwork], 'confirmed');
      
      // Get the public key as a proper PublicKey object
      const fromPubkey = new PublicKey(provider.publicKey.toString());
      
      // Get the latest blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

      // Create the transfer transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey: TREASURY_WALLET,
          lamports: lamports,
        })
      );

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      console.log(`Sending ${lamports} lamports on ${targetNetwork}...`);

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
  }, [network]);

  return {
    sendPayment,
    loading,
    network,
    setNetwork,
  };
}
