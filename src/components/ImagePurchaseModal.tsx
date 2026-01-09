import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { usePhantom } from '@/hooks/usePhantom';
import { useSolanaTransaction } from '@/hooks/useSolanaTransaction';
import { lamportsToSol } from '@/hooks/usePixels';
import { useImagePlacements, type ImagePlacement } from '@/hooks/useImagePlacements';
import { supabase } from '@/integrations/supabase/client';
import { Upload, AlertTriangle } from 'lucide-react';

interface ImagePurchaseModalProps {
  open: boolean;
  onClose: () => void;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  preloadedImage?: string;
  preloadedLinkUrl?: string;
}

const BASE_PRICE_PER_PIXEL = 1_000; // 0.000001 SOL per pixel

export function ImagePurchaseModal({ 
  open, 
  onClose, 
  startX, 
  startY, 
  endX, 
  endY,
  preloadedImage,
  preloadedLinkUrl,
}: ImagePurchaseModalProps) {
  const { publicKey, connected } = usePhantom();
  const { sendPayment, loading: txLoading } = useSolanaTransaction();
  const { getOverlappingPlacements } = useImagePlacements();
  const [loading, setLoading] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate bounds
  const minX = Math.min(startX, endX);
  const maxX = Math.max(startX, endX);
  const minY = Math.min(startY, endY);
  const maxY = Math.max(startY, endY);
  
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const pixelCount = width * height;

  // Get overlapping placements
  const overlappingPlacements = getOverlappingPlacements(minX, minY, width, height);
  const ownPlacements = overlappingPlacements.filter(p => p.owner_wallet === publicKey);
  const otherPlacements = overlappingPlacements.filter(p => p.owner_wallet !== publicKey);

  // Calculate cost
  const baseCost = pixelCount * BASE_PRICE_PER_PIXEL;
  const outbidCost = otherPlacements.reduce((sum, p) => sum + Number(p.price_lamports), 0);
  const totalCost = baseCost + outbidCost;

  // Handle file upload
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    
    setUploadedFile(file);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle preloaded image
  useEffect(() => {
    if (open && preloadedImage) {
      setImagePreview(preloadedImage);
      if (preloadedLinkUrl) {
        setLinkUrl(preloadedLinkUrl);
      }
    }
  }, [open, preloadedImage, preloadedLinkUrl]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setImagePreview(null);
      setUploadedFile(null);
      setLinkUrl('');
    }
  }, [open]);

  const handlePurchase = async () => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!imagePreview) {
      toast.error('Please upload an image');
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

      toast.success('Payment confirmed! Uploading image...');

      // Call the new edge function
      const { data, error } = await supabase.functions.invoke('place-image', {
        body: {
          x: minX,
          y: minY,
          width,
          height,
          image_base64: imagePreview,
          link_url: linkUrl || null,
          price_lamports: totalCost,
          wallet: publicKey,
          transaction_signature: transactionSignature,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error(error.message || 'Failed to place image');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`Image placed successfully! 🎨`);
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
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            🖼️ Place Image
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

          {/* Selection info */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Position</div>
                <div className="font-mono text-sm text-foreground">
                  ({minX}, {minY})
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Size</div>
                <div className="font-mono text-sm text-foreground">
                  {width} × {height} = {pixelCount} pixels
                </div>
              </div>
            </div>
          </div>

          {/* Image upload */}
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Upload Image (will cover {width}×{height} area)
            </div>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
            >
              <Upload className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {uploadedFile ? uploadedFile.name : 'Click to upload image'}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Link URL input */}
          <div>
            <label className="text-xs text-muted-foreground block mb-2">
              Link URL (optional - clicking this image will open this URL)
            </label>
            <Input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://yourwebsite.com"
              className="bg-muted border-border text-foreground"
            />
          </div>

          {/* Image preview */}
          {imagePreview && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Preview</div>
              <div className="flex justify-center">
                <img 
                  src={imagePreview} 
                  alt="Preview"
                  className="max-w-full max-h-40 object-contain rounded border border-border"
                />
              </div>
            </div>
          )}

          {/* Outbid warning */}
          {otherPlacements.length > 0 && (
            <div className="p-4 bg-orange-500/20 rounded-lg border border-orange-500/50">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-orange-300">
                    Overlaps {otherPlacements.length} existing image{otherPlacements.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-orange-200/80 mt-1">
                    You'll outbid these placements. Cost includes their current value.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pricing info */}
          <div className="p-4 bg-accent/20 rounded-lg border border-accent/30 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">
                {pixelCount} pixels × {lamportsToSol(BASE_PRICE_PER_PIXEL).toFixed(6)} SOL
              </span>
              <span className="font-mono text-foreground">
                {lamportsToSol(baseCost).toFixed(6)} SOL
              </span>
            </div>
            
            {outbidCost > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Outbid premium</span>
                <span className="font-mono text-orange-400">
                  {lamportsToSol(outbidCost).toFixed(6)} SOL
                </span>
              </div>
            )}
            
            <div className="border-t border-border pt-3 flex justify-between items-center">
              <div className="text-xs text-muted-foreground">Total Cost</div>
              <div className="text-lg font-bold text-accent">
                {lamportsToSol(totalCost).toFixed(6)} SOL
              </div>
            </div>
          </div>

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
              disabled={isProcessing || !connected || !imagePreview}
              className="flex-1 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                  {txLoading ? 'Sending...' : 'Uploading...'}
                </>
              ) : (
                `Pay ${lamportsToSol(totalCost).toFixed(6)} SOL`
              )}
            </Button>
          </div>

          {!connected && (
            <p className="text-xs text-center text-muted-foreground">
              Connect your Phantom wallet to place images
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
