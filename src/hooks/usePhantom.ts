import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface PhantomProvider {
  isPhantom: boolean;
  publicKey: { toString: () => string } | null;
  isConnected: boolean;
  signTransaction: (transaction: unknown) => Promise<unknown>;
  signAllTransactions: (transactions: unknown[]) => Promise<unknown[]>;
  signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  off: (event: string, callback: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    solana?: PhantomProvider;
  }
}

export interface UsePhantomReturn {
  connected: boolean;
  publicKey: string | null;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<string | null>;
  isPhantomInstalled: boolean;
}

export function usePhantom(): UsePhantomReturn {
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [isPhantomInstalled, setIsPhantomInstalled] = useState(false);

  useEffect(() => {
    const checkPhantom = () => {
      const provider = window.solana;
      if (provider?.isPhantom) {
        setIsPhantomInstalled(true);
        
        if (provider.isConnected && provider.publicKey) {
          setConnected(true);
          setPublicKey(provider.publicKey.toString());
        }

        const handleConnect = () => {
          if (provider.publicKey) {
            setConnected(true);
            setPublicKey(provider.publicKey.toString());
          }
        };

        const handleDisconnect = () => {
          setConnected(false);
          setPublicKey(null);
        };

        provider.on('connect', handleConnect);
        provider.on('disconnect', handleDisconnect);

        return () => {
          provider.off('connect', handleConnect);
          provider.off('disconnect', handleDisconnect);
        };
      }
    };

    // Check immediately and after a short delay (Phantom might load after page)
    checkPhantom();
    const timeout = setTimeout(checkPhantom, 500);
    
    return () => clearTimeout(timeout);
  }, []);

  const connect = useCallback(async () => {
    const provider = window.solana;
    
    if (!provider?.isPhantom) {
      window.open('https://phantom.app/', '_blank');
      toast.error('Phantom wallet not found. Please install it.');
      return;
    }

    try {
      setConnecting(true);
      const response = await provider.connect();
      setConnected(true);
      setPublicKey(response.publicKey.toString());
      toast.success('Wallet connected!');
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      toast.error('Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    // Soft disconnect: only clear app state without revoking Phantom access
    // This allows quick reconnection without requiring wallet approval again
    setConnected(false);
    setPublicKey(null);
    toast.success('Wallet disconnected');
  }, []);

  const signMessage = useCallback(async (message: string): Promise<string | null> => {
    const provider = window.solana;
    
    if (!provider || !connected) {
      toast.error('Wallet not connected');
      return null;
    }

    try {
      const encodedMessage = new TextEncoder().encode(message);
      const { signature } = await provider.signMessage(encodedMessage);
      
      // Convert signature to base58
      const signatureBase58 = btoa(String.fromCharCode(...signature));
      return signatureBase58;
    } catch (error) {
      console.error('Failed to sign message:', error);
      toast.error('Failed to sign message');
      return null;
    }
  }, [connected]);

  return {
    connected,
    publicKey,
    connecting,
    connect,
    disconnect,
    signMessage,
    isPhantomInstalled,
  };
}
