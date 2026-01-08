import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { usePhantom } from '@/hooks/usePhantom';
import { useSolanaTransaction } from '@/hooks/useSolanaTransaction';
import { type Pixel, lamportsToSol, solToLamports } from '@/hooks/usePixels';
import { supabase } from '@/integrations/supabase/client';

interface OutbidBatchModalProps {
  open: boolean;
  onClose: () => void;
  batchId: string;
  clickedPixel: Pixel;
}

const OUTBID_PREMIUM_LAMPORTS = 10_000; // 0.00001 SOL extra per pixel

export function OutbidBatchModal({ open, onClose, batchId, clickedPixel }: OutbidBatchModalProps) {
  const { publicKey, connected } = usePhantom();
  const { sendPayment, loading: txLoading } = useSolanaTransaction();
  const [loading, setLoading] = useState(false);
  const [batchPixels, setBatchPixels] = useState<Pixel[]>([]);
  const [loadingBatch, setLoadingBatch] = useState(true);

  // Fetch all pixels in this batch
  useEffect(() => {
    if (!open || !batchId) return;

    const fetchBatchPixels = async () => {
      setLoadingBatch(true);
      try {
        const { data, error } = await supabase
          .from('pixels')
          .select('*')
          .eq('batch_id', batchId);

        if (error) throw error;
        setBatchPixels(data || []);
      } catch (err) {
        console.error('Failed to fetch batch pixels:', err);
        toast.error('Failed to load batch information');
      } finally {
        setLoadingBatch(false);
      }
    };

    fetchBatchPixels();
  }, [open, batchId]);

  const pixelCount = batchPixels.length;
  const currentPricePerPixel = clickedPixel.price_lamports;
  const newPricePerPixel = currentPricePerPixel + OUTBID_PREMIUM_LAMPORTS;
  const totalCost = newPricePerPixel * pixelCount;

  // Calculate bounding box for display
  const minX = batchPixels.length > 0 ? Math.min(...batchPixels.map(p => p.x)) : 0;
  const maxX = batchPixels.length > 0 ? Math.max(...batchPixels.map(p => p.x)) : 0;
  const minY = batchPixels.length > 0 ? Math.min(...batchPixels.map(p => p.y)) : 0;
  const maxY = batchPixels.length > 0 ? Math.max(...batchPixels.map(p => p.y)) : 0;

  const handleOutbid = async () => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (batchPixels.length === 0) {
      toast.error('No pixels found in batch');
      return;
    }

    setLoading(true);

    try {
      toast.info('Please approve the transaction in Phantom...');
      const transactionSignature = await sendPayment(totalCost);
      
      if (!transactionSignature) {
        setLoading(false);
        return;
      }

      toast.success('Payment confirmed! Claiming pixels...');

      // Build pixels array with existing colors
      const pixels = batchPixels.map(p => ({
        x: p.x,
        y: p.y,
        color: p.color,
      }));

      // Call the edge function for bulk placement (to claim all pixels)
      const { data, error } = await supabase.functions.invoke('place-pixels-bulk', {
        body: {
          pixels,
          price_lamports: totalCost,
          wallet: publicKey,
          transaction_signature: transactionSignature,
          network: 'mainnet-beta',
          link_url: clickedPixel.link_url || null,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error(error.message || 'Failed to claim pixels');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`${pixelCount} pixels claimed successfully! 🎨`);
      onClose();
    } catch (error) {
      console.error('Outbid error:', error);
      toast.error('Failed to complete outbid');
    } finally {
      setLoading(false);
    }
  };

  const isProcessing = loading || txLoading;
  const isOwnBatch = clickedPixel.owner_wallet === publicKey;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            💰 Outbid Pixel Batch
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

          {loadingBatch ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Warning about batch purchase */}
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/30">
                <p className="text-sm text-foreground">
                  This pixel is part of a batch purchase. To claim it, you must outbid <strong>all {pixelCount} pixels</strong> in the batch.
                </p>
              </div>

              {/* Batch info */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Batch Area</div>
                    <div className="font-mono text-sm text-foreground">
                      ({minX}, {minY}) → ({maxX}, {maxY})
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Total Pixels</div>
                    <div className="font-mono text-sm text-foreground">
                      {pixelCount} pixels
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-xs text-muted-foreground">Current Owner</div>
                  <div className="font-mono text-xs text-foreground truncate">
                    {clickedPixel.owner_wallet}
                  </div>
                </div>
              </div>

              {/* Pricing breakdown */}
              <div className="p-4 bg-muted rounded-lg border border-border">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Current price per pixel</span>
                    <span className="font-mono text-foreground">
                      {lamportsToSol(currentPricePerPixel).toFixed(4)} SOL
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">+ Outbid premium per pixel</span>
                    <span className="font-mono text-primary">
                      +{lamportsToSol(OUTBID_PREMIUM_LAMPORTS).toFixed(4)} SOL
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">New price per pixel</span>
                    <span className="font-mono text-foreground">
                      {lamportsToSol(newPricePerPixel).toFixed(4)} SOL
                    </span>
                  </div>
                  <div className="border-t border-border pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">× {pixelCount} pixels</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total cost */}
              <div className="p-4 bg-accent/20 rounded-lg border border-accent/30">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-xs text-muted-foreground">Total Cost to Claim Batch</div>
                    <div className="text-xl font-bold text-accent">
                      {lamportsToSol(totalCost).toFixed(4)} SOL
                    </div>
                  </div>
                </div>
              </div>

              {isOwnBatch && (
                <div className="p-4 bg-accent/20 rounded-lg border border-accent/30">
                  <p className="text-sm text-accent-foreground">
                    This batch belongs to you! You can update pixels individually.
                  </p>
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
                  onClick={handleOutbid}
                  disabled={isProcessing || !connected || isOwnBatch}
                  className="flex-1 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                      {txLoading ? 'Sending...' : 'Processing...'}
                    </>
                  ) : (
                    `Outbid ${pixelCount} Pixels`
                  )}
                </Button>
              </div>

              {!connected && (
                <p className="text-xs text-center text-muted-foreground">
                  Connect your Phantom wallet to outbid
                </p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}