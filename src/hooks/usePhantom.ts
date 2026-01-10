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
  on: (event: 'connect' | 'disconnect' | 'accountChanged', callback: (...args: unknown[]) => void) => void;
  off: (event: 'connect' | 'disconnect' | 'accountChanged', callback: (...args: unknown[]) => void) => void;
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

        const handleAccountChanged = (next: unknown) => {
          // Phantom emits accountChanged when user switches accounts inside the wallet UI
          if (!next) {
            setConnected(false);
            setPublicKey(null);
            return;
          }

          try {
            const nextStr =
              typeof next === 'string'
                ? next
                : (next as { toString?: () => string })?.toString?.();

            if (nextStr) {
              setConnected(true);
              setPublicKey(nextStr);
            }
          } catch {
            // Ignore malformed payloads
          }
        };

        provider.on('connect', handleConnect);
        provider.on('disconnect', handleDisconnect);
        provider.on('accountChanged', handleAccountChanged);

        return () => {
          provider.off('connect', handleConnect);
          provider.off('disconnect', handleDisconnect);
          provider.off('accountChanged', handleAccountChanged);
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
      
      // Disconnect first to clear any cached state
      try {
        await provider.disconnect();
        setConnected(false);
        setPublicKey(null);
      } catch {
        // Ignore disconnect errors
      }
      
      // Connect to get the public key
      const response = await provider.connect();
      const walletAddress = response.publicKey.toString();
      
      // Force authentication by requiring a message signature
      // This ALWAYS triggers Phantom's popup and requires user interaction
      const message = `Sign in to x402homepage\n\nWallet: ${walletAddress}\nTimestamp: ${Date.now()}`;
      const encodedMessage = new TextEncoder().encode(message);
      
      try {
        await provider.signMessage(encodedMessage);
        // Signature succeeded - user is authenticated
        setConnected(true);
        setPublicKey(walletAddress);
        toast.success('Wallet connected!');
      } catch (signError) {
        // User rejected the signature - disconnect
        console.log('User rejected signature:', signError);
        await provider.disconnect();
        setConnected(false);
        setPublicKey(null);
        toast.error('Connection cancelled');
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      toast.error('Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    const provider = window.solana;
    
    if (provider) {
      try {
        await provider.disconnect();
        setConnected(false);
        setPublicKey(null);
        toast.success('Wallet disconnected');
      } catch (error) {
        console.error('Failed to disconnect wallet:', error);
        // Still clear local state even if disconnect fails
        setConnected(false);
        setPublicKey(null);
      }
    }
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
