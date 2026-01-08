import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { usePhantom } from '@/hooks/usePhantom';
import { useSolanaTransaction } from '@/hooks/useSolanaTransaction';
import { lamportsToSol } from '@/hooks/usePixels';
import { supabase } from '@/integrations/supabase/client';
import { Upload, AlertTriangle } from 'lucide-react';

interface BulkPurchaseModalProps {
  open: boolean;
  onClose: () => void;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface ExistingPixel {
  x: number;
  y: number;
  price_lamports: number;
  owner_wallet: string | null;
}

const BASE_PRICE_LAMPORTS = 100_000; // 0.0001 SOL per pixel

export function BulkPurchaseModal({ 
  open, 
  onClose, 
  startX, 
  startY, 
  endX, 
  endY 
}: BulkPurchaseModalProps) {
  const { publicKey, connected } = usePhantom();
  const { sendPayment, loading: txLoading } = useSolanaTransaction();
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedColors, setExtractedColors] = useState<string[][]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [existingPixels, setExistingPixels] = useState<ExistingPixel[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const minX = Math.min(startX, endX);
  const maxX = Math.max(startX, endX);
  const minY = Math.min(startY, endY);
  const maxY = Math.max(startY, endY);
  
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const pixelCount = width * height;

  // Fetch existing pixels in the selection area
  useEffect(() => {
    if (!open) return;
    
    const fetchExistingPixels = async () => {
      setLoadingPrices(true);
      try {
        const { data, error } = await supabase
          .from('pixels')
          .select('x, y, price_lamports, owner_wallet')
          .gte('x', minX)
          .lte('x', maxX)
          .gte('y', minY)
          .lte('y', maxY);
        
        if (error) throw error;
        setExistingPixels(data || []);
      } catch (err) {
        console.error('Failed to fetch existing pixels:', err);
        setExistingPixels([]);
      } finally {
        setLoadingPrices(false);
      }
    };
    
    fetchExistingPixels();
  }, [open, minX, maxX, minY, maxY]);

  // Calculate total cost considering existing pixels
  const { totalCost, newPixelCount, outbidPixelCount, outbidCost, newCost } = (() => {
    const existingMap = new Map<string, ExistingPixel>();
    existingPixels.forEach(p => existingMap.set(`${p.x},${p.y}`, p));
    
    let newCount = 0;
    let outbidCount = 0;
    let totalNewCost = 0;
    let totalOutbidCost = 0;
    
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const existing = existingMap.get(`${x},${y}`);
        if (existing && existing.owner_wallet) {
          // Owned pixel - needs outbid price (current price + 0.0001 SOL)
          outbidCount++;
          totalOutbidCost += existing.price_lamports + BASE_PRICE_LAMPORTS;
        } else {
          // New pixel - base price
          newCount++;
          totalNewCost += BASE_PRICE_LAMPORTS;
        }
      }
    }
    
    return {
      totalCost: totalNewCost + totalOutbidCost,
      newPixelCount: newCount,
      outbidPixelCount: outbidCount,
      outbidCost: totalOutbidCost,
      newCost: totalNewCost,
    };
  })();

  const extractColorsFromImage = (imageSrc: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      setImagePreview(imageSrc);
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(img, 0, 0, width, height);
      
      const colors: string[][] = [];
      for (let y = 0; y < height; y++) {
        const row: string[] = [];
        for (let x = 0; x < width; x++) {
          const pixel = ctx.getImageData(x, y, 1, 1).data;
          const hex = '#' + 
            pixel[0].toString(16).padStart(2, '0') +
            pixel[1].toString(16).padStart(2, '0') +
            pixel[2].toString(16).padStart(2, '0');
          row.push(hex.toUpperCase());
        }
        colors.push(row);
      }
      setExtractedColors(colors);
    };
    
    img.onerror = () => {
      toast.error('Failed to load image.');
      setImagePreview(null);
      setExtractedColors([]);
    };
    
    img.src = imageSrc;
  };

  // Handle file upload
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    
    setUploadedFile(file);
    setImageUrl(''); // Clear URL input
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      extractColorsFromImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Extract colors from URL when it changes
  useEffect(() => {
    if (!imageUrl) {
      if (!uploadedFile) {
        setImagePreview(null);
        setExtractedColors([]);
      }
      return;
    }
    
    setUploadedFile(null); // Clear uploaded file
    extractColorsFromImage(imageUrl);
  }, [imageUrl, width, height]);

  const handlePurchase = async () => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (extractedColors.length === 0) {
      toast.error('Please provide a valid image URL');
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

      toast.success('Payment confirmed! Placing pixels...');

      // Build pixels array
      const pixels: Array<{ x: number; y: number; color: string }> = [];
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          pixels.push({
            x: minX + x,
            y: minY + y,
            color: extractedColors[y][x],
          });
        }
      }

      // Call the edge function for bulk placement
      const { data, error } = await supabase.functions.invoke('place-pixels-bulk', {
        body: {
          pixels,
          price_lamports: totalCost,
          wallet: publicKey,
          transaction_signature: transactionSignature,
          network: 'mainnet-beta',
          link_url: linkUrl || null,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error(error.message || 'Failed to place pixels');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`${pixelCount} pixels placed successfully! 🎨`);
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
            🖼️ Bulk Purchase Pixels
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Hidden canvas for color extraction */}
          <canvas ref={canvasRef} className="hidden" />

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
                <div className="text-xs text-muted-foreground">Selection</div>
                <div className="font-mono text-sm text-foreground">
                  ({minX}, {minY}) → ({maxX}, {maxY})
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

          {/* Image source - Upload or URL */}
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Image Source (will be resized to {width}×{height})
            </div>
            
            {/* File upload */}
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

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* URL input */}
            <Input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.png"
              className="bg-muted border-border text-foreground"
            />
          </div>

          {/* Link URL input */}
          <div>
            <label className="text-xs text-muted-foreground block mb-2">
              Link URL (optional - clicking these pixels will open this URL)
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
              <div className="text-xs text-muted-foreground">Preview (scaled to selection)</div>
              <div className="flex justify-center">
                <img 
                  src={imagePreview} 
                  alt="Preview"
                  className="max-w-full max-h-40 object-contain rounded border border-border"
                  style={{ 
                    imageRendering: 'pixelated',
                    width: Math.min(width * 4, 200),
                    height: Math.min(height * 4, 200),
                  }}
                />
              </div>
              {extractedColors.length > 0 && (
                <div className="text-xs text-accent text-center">
                  ✓ {extractedColors.length * extractedColors[0]?.length || 0} colors extracted
                </div>
              )}
            </div>
          )}

          {/* Outbid warning */}
          {outbidPixelCount > 0 && (
            <div className="p-4 bg-orange-500/20 rounded-lg border border-orange-500/50">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-orange-300">
                    {outbidPixelCount} pixel{outbidPixelCount > 1 ? 's are' : ' is'} already owned
                  </p>
                  <p className="text-orange-200/80 mt-1">
                    Outbid cost = previous price + 0.0001 SOL per pixel.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pricing info */}
          <div className="p-4 bg-accent/20 rounded-lg border border-accent/30 space-y-3">
            {loadingPrices ? (
              <div className="text-center text-muted-foreground text-sm">
                Calculating prices...
              </div>
            ) : (
              <>
                {newPixelCount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                      {newPixelCount} new pixel{newPixelCount > 1 ? 's' : ''} × {lamportsToSol(BASE_PRICE_LAMPORTS).toFixed(4)} SOL
                    </span>
                    <span className="font-mono text-foreground">
                      {lamportsToSol(newCost).toFixed(4)} SOL
                    </span>
                  </div>
                )}
                {outbidPixelCount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                      {outbidPixelCount} outbid pixel{outbidPixelCount > 1 ? 's' : ''} (+0.0001 SOL each)
                    </span>
                    <span className="font-mono text-orange-400">
                      {lamportsToSol(outbidCost).toFixed(4)} SOL
                    </span>
                  </div>
                )}
                <div className="border-t border-border pt-3 flex justify-between items-center">
                  <div className="text-xs text-muted-foreground">Total Cost</div>
                  <div className="text-lg font-bold text-accent">
                    {lamportsToSol(totalCost).toFixed(4)} SOL
                  </div>
                </div>
              </>
            )}
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
              disabled={isProcessing || !connected || extractedColors.length === 0}
              className="flex-1 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                  {txLoading ? 'Sending...' : 'Placing...'}
                </>
              ) : (
                `Purchase ${pixelCount} Pixels`
              )}
            </Button>
          </div>

          {!connected && (
            <p className="text-xs text-center text-muted-foreground">
              Connect your Phantom wallet to place pixels
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
