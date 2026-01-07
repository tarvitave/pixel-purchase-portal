import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { usePhantom } from '@/hooks/usePhantom';
import { useSolanaTransaction } from '@/hooks/useSolanaTransaction';
import { type Pixel, lamportsToSol, getMinBidLamports, solToLamports } from '@/hooks/usePixels';
import { supabase } from '@/integrations/supabase/client';

interface PurchaseModalProps {
  open: boolean;
  onClose: () => void;
  x: number;
  y: number;
  color: string;
  existingPixel?: Pixel;
}

const BASE_PRICE_SOL = 0.0001;

export function PurchaseModal({ open, onClose, x, y, color, existingPixel }: PurchaseModalProps) {
  const { publicKey, connected } = usePhantom();
  const { sendPayment, loading: txLoading, network } = useSolanaTransaction();
  const [loading, setLoading] = useState(false);
  const [bidAmount, setBidAmount] = useState<string>('');

  const isOwned = !!existingPixel;
  const isOwnPixel = existingPixel?.owner_wallet === publicKey;
  const minBidLamports = isOwned ? getMinBidLamports(existingPixel.price_lamports) : solToLamports(BASE_PRICE_SOL);
  const minBidSol = lamportsToSol(minBidLamports);

  const handlePurchase = async () => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    const bidLamports = bidAmount ? solToLamports(parseFloat(bidAmount)) : minBidLamports;

    if (bidLamports < minBidLamports) {
      toast.error(`Minimum bid is ${minBidSol.toFixed(4)} SOL`);
      return;
    }

    setLoading(true);

    try {
      let transactionSignature: string | null = null;

      // Only send payment if there's a cost (not updating own pixel)
      if (!isOwnPixel) {
        toast.info('Please approve the transaction in Phantom...');
        transactionSignature = await sendPayment(bidLamports);
        
        if (!transactionSignature) {
          setLoading(false);
          return; // User cancelled or transaction failed
        }

        toast.success('Payment confirmed! Placing pixel...');
      }

      // Call the edge function to verify and place the pixel
      const { data, error } = await supabase.functions.invoke('place-pixel', {
        body: {
          x,
          y,
          color,
          price_lamports: bidLamports,
          wallet: publicKey,
          transaction_signature: transactionSignature,
          network,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error(error.message || 'Failed to place pixel');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success('Pixel placed successfully! 🎨');
      onClose();
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Failed to complete purchase');
    } finally {
      setLoading(false);
    }
  };

  const isProcessing = loading || txLoading;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            {isOwned ? (
              isOwnPixel ? '✏️ Update Your Pixel' : '💰 Outbid Pixel'
            ) : (
              '🎨 Claim Pixel'
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Network indicator */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Network:</span>
            <span className="px-3 py-1 rounded text-xs font-medium bg-accent text-accent-foreground">
              Solana Mainnet
            </span>
          </div>

          {/* Pixel preview */}
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <div 
              className="w-16 h-16 rounded-lg border-2 border-border shadow-lg"
              style={{ backgroundColor: color }}
            />
            <div>
              <div className="text-xs text-muted-foreground">Position</div>
              <div className="font-mono text-lg text-foreground">
                ({x}, {y})
              </div>
              <div className="text-xs text-muted-foreground mt-1">Color</div>
              <div className="font-mono text-sm text-foreground">{color}</div>
            </div>
          </div>

          {/* Pricing info */}
          {isOwned && !isOwnPixel && (
            <div className="p-4 bg-muted rounded-lg border border-primary/30">
              <div className="text-xs text-muted-foreground mb-1">Current owner paid</div>
              <div className="text-lg font-bold text-foreground">
                {lamportsToSol(existingPixel.price_lamports).toFixed(4)} SOL
              </div>
              <div className="text-xs text-muted-foreground mt-2">Minimum bid to claim</div>
              <div className="text-lg font-bold text-primary">
                {minBidSol.toFixed(4)} SOL
              </div>
            </div>
          )}

          {isOwnPixel && (
            <div className="p-4 bg-accent/20 rounded-lg border border-accent/30">
              <p className="text-sm text-accent-foreground">
                This is your pixel! You can update its color for free.
              </p>
            </div>
          )}

          {!isOwned && (
            <div className="p-4 bg-accent/20 rounded-lg border border-accent/30">
              <div className="text-xs text-muted-foreground mb-1">Price</div>
              <div className="text-lg font-bold text-accent">
                {BASE_PRICE_SOL} SOL (~$0.15)
              </div>
            </div>
          )}

          {/* Custom bid input for outbidding */}
          {isOwned && !isOwnPixel && (
            <div>
              <label className="text-xs text-muted-foreground block mb-2">
                Your bid (SOL)
              </label>
              <input
                type="number"
                step="0.0001"
                min={minBidSol}
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder={minBidSol.toFixed(4)}
                className="w-full bg-muted border border-border rounded-lg px-4 py-2 text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-border"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePurchase}
              disabled={isProcessing || !connected}
              className="flex-1 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                  {txLoading ? 'Sending...' : 'Processing...'}
                </>
              ) : isOwnPixel ? (
                'Update Color'
              ) : (
                `Pay ${bidAmount || minBidSol.toFixed(4)} SOL`
              )}
            </Button>
          </div>

          {!connected && (
            <p className="text-xs text-center text-muted-foreground">
              Connect your Phantom wallet to place pixels
            </p>
          )}

          {/* Transaction info */}
          {!isOwnPixel && connected && (
            <p className="text-xs text-center text-muted-foreground">
              Real SOL transaction on Solana Mainnet
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
