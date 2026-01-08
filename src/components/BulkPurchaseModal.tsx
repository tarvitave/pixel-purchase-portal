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
  batch_id: string | null;
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

  // Original selection bounds
  const selMinX = Math.min(startX, endX);
  const selMaxX = Math.max(startX, endX);
  const selMinY = Math.min(startY, endY);
  const selMaxY = Math.max(startY, endY);

  // State for expanded bounds (after considering batch pixels)
  const [expandedBounds, setExpandedBounds] = useState({ 
    minX: selMinX, maxX: selMaxX, minY: selMinY, maxY: selMaxY 
  });

  // Final bounds (may be expanded to form rectangle)
  const minX = expandedBounds.minX;
  const maxX = expandedBounds.maxX;
  const minY = expandedBounds.minY;
  const maxY = expandedBounds.maxY;
  
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const pixelCount = width * height;

  // Track if area was expanded
  const wasExpanded = minX !== selMinX || maxX !== selMaxX || minY !== selMinY || maxY !== selMaxY;

  // Fetch existing pixels in the selection area AND full batches if overlapping
  // Then calculate expanded bounding box to form a rectangle
  useEffect(() => {
    if (!open) return;

    // Reset expanded bounds when modal opens
    setExpandedBounds({ minX: selMinX, maxX: selMaxX, minY: selMinY, maxY: selMaxY });

    const fetchExistingPixels = async () => {
      const PAGE_SIZE = 1000;
      setLoadingPrices(true);

      const fetchPixelsInBounds = async (
        minX: number,
        maxX: number,
        minY: number,
        maxY: number
      ): Promise<ExistingPixel[]> => {
        const all: ExistingPixel[] = [];
        let from = 0;

        while (true) {
          const { data, error } = await supabase
            .from('pixels')
            .select('x, y, price_lamports, owner_wallet, batch_id')
            .gte('x', minX)
            .lte('x', maxX)
            .gte('y', minY)
            .lte('y', maxY)
            .range(from, from + PAGE_SIZE - 1);

          if (error) throw error;

          const page = (data || []) as ExistingPixel[];
          all.push(...page);

          if (page.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }

        return all;
      };

      const fetchPixelsByBatchIds = async (batchIds: string[]): Promise<ExistingPixel[]> => {
        if (batchIds.length === 0) return [];

        const all: ExistingPixel[] = [];
        let from = 0;

        while (true) {
          const { data, error } = await supabase
            .from('pixels')
            .select('x, y, price_lamports, owner_wallet, batch_id')
            .in('batch_id', batchIds)
            .range(from, from + PAGE_SIZE - 1);

          if (error) throw error;

          const page = (data || []) as ExistingPixel[];
          all.push(...page);

          if (page.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }

        return all;
      };

      try {
        // First, get pixels in the selection area (paged; backend caps at 1000 per call)
        const selectionPixels = await fetchPixelsInBounds(selMinX, selMaxX, selMinY, selMaxY);

        // Find unique batch_ids from overlapping pixels
        const batchIds = new Set<string>();
        selectionPixels.forEach((p) => {
          if (p.batch_id) batchIds.add(p.batch_id);
        });

        // If there are batches, fetch ALL pixels from those batches
        let allPixels = selectionPixels;
        if (batchIds.size > 0) {
          const batchPixels = await fetchPixelsByBatchIds(Array.from(batchIds));

          // Merge: use a map to avoid duplicates
          const pixelMap = new Map<string, ExistingPixel>();
          allPixels.forEach((p) => pixelMap.set(`${p.x},${p.y}`, p));
          batchPixels.forEach((p) => pixelMap.set(`${p.x},${p.y}`, p));
          allPixels = Array.from(pixelMap.values());

          // Calculate expanded bounding box to ensure rectangle
          let newMinX = selMinX,
            newMaxX = selMaxX,
            newMinY = selMinY,
            newMaxY = selMaxY;

          allPixels.forEach((p) => {
            newMinX = Math.min(newMinX, p.x);
            newMaxX = Math.max(newMaxX, p.x);
            newMinY = Math.min(newMinY, p.y);
            newMaxY = Math.max(newMaxY, p.y);
          });

          // Update expanded bounds
          setExpandedBounds({ minX: newMinX, maxX: newMaxX, minY: newMinY, maxY: newMaxY });

          // Now fetch ALL pixels in the expanded area (for correct pricing)
          if (newMinX !== selMinX || newMaxX !== selMaxX || newMinY !== selMinY || newMaxY !== selMaxY) {
            const expandedPixels = await fetchPixelsInBounds(newMinX, newMaxX, newMinY, newMaxY);
            expandedPixels.forEach((p) => pixelMap.set(`${p.x},${p.y}`, p));
            allPixels = Array.from(pixelMap.values());
          }
        }

        setExistingPixels(allPixels);
      } catch (err) {
        console.error('Failed to fetch existing pixels:', err);
        setExistingPixels([]);
      } finally {
        setLoadingPrices(false);
      }
    };

    fetchExistingPixels();
  }, [open, selMinX, selMaxX, selMinY, selMaxY]);

  // Calculate total cost for the entire rectangle (expanded bounds)
  // Own pixels are FREE to update - only charge for new pixels and outbidding others
  const {
    totalCost,
    newPixelCount,
    outbidPixelCount,
    outbidCost,
    newCost,
    ownPixelCount,
    affectedBatches,

    // Debug/clarity stats
    selectionNewCount,
    selectionOutbidCount,
    selectionOwnCount,
    selectionCost,

    addedNewCount,
    addedOutbidCount,
    addedOwnCount,
    addedCost,
  } = (() => {
    const existingMap = new Map<string, ExistingPixel>();
    existingPixels.forEach((p) => existingMap.set(`${p.x},${p.y}`, p));

    const classify = (existing: ExistingPixel | undefined) => {
      if (existing && existing.owner_wallet) {
        if (existing.owner_wallet === publicKey) {
          return { kind: 'own' as const, cost: 0 };
        }
        return { kind: 'outbid' as const, cost: existing.price_lamports + BASE_PRICE_LAMPORTS };
      }
      return { kind: 'new' as const, cost: BASE_PRICE_LAMPORTS };
    };

    const apply = (
      bucket: {
        newCount: number;
        outbidCount: number;
        ownCount: number;
        cost: number;
      },
      res: { kind: 'new' | 'outbid' | 'own'; cost: number }
    ) => {
      if (res.kind === 'new') bucket.newCount++;
      if (res.kind === 'outbid') bucket.outbidCount++;
      if (res.kind === 'own') bucket.ownCount++;
      bucket.cost += res.cost;
    };

    // Totals across expanded rectangle
    const totals = { newCount: 0, outbidCount: 0, ownCount: 0, cost: 0 };
    const selection = { newCount: 0, outbidCount: 0, ownCount: 0, cost: 0 };
    const added = { newCount: 0, outbidCount: 0, ownCount: 0, cost: 0 };

    const batchIds = new Set<string>();

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const existing = existingMap.get(`${x},${y}`);
        const res = classify(existing);

        apply(totals, res);

        const inSelection = x >= selMinX && x <= selMaxX && y >= selMinY && y <= selMaxY;
        apply(inSelection ? selection : added, res);

        if (res.kind === 'outbid' && existing?.batch_id) batchIds.add(existing.batch_id);
      }
    }

    return {
      totalCost: totals.cost,
      newPixelCount: totals.newCount,
      outbidPixelCount: totals.outbidCount,
      outbidCost: totals.cost - (totals.newCount * BASE_PRICE_LAMPORTS),
      newCost: totals.newCount * BASE_PRICE_LAMPORTS,
      ownPixelCount: totals.ownCount,
      affectedBatches: batchIds.size,

      selectionNewCount: selection.newCount,
      selectionOutbidCount: selection.outbidCount,
      selectionOwnCount: selection.ownCount,
      selectionCost: selection.cost,

      addedNewCount: added.newCount,
      addedOutbidCount: added.outbidCount,
      addedOwnCount: added.ownCount,
      addedCost: added.cost,
    };
  })();

  // Total pixels to purchase (entire rectangle)
  const totalPixelsToPurchase = pixelCount;

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
      let transactionSignature: string | null = null;

      // Only require payment if there's a cost (not just updating own pixels)
      if (totalCost > 0) {
        toast.info('Please approve the transaction in Phantom...');
        transactionSignature = await sendPayment(totalCost);
        
        if (!transactionSignature) {
          setLoading(false);
          return;
        }

        toast.success('Payment confirmed! Placing pixels...');
      } else {
        toast.info('Updating your pixels...');
      }

      // Build pixels array from entire rectangle (expanded bounds)
      const pixels: Array<{ x: number; y: number; color: string }> = [];
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          pixels.push({
            x: minX + x,
            y: minY + y,
            color: extractedColors[y]?.[x] || '#000000',
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

      toast.success(`${totalPixelsToPurchase} pixels placed successfully! 🎨`);
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

          {/* Selection/Rectangle info */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">
                  {wasExpanded ? 'Expanded Rectangle' : 'Selection'}
                </div>
                <div className="font-mono text-sm text-foreground">
                  ({minX}, {minY}) → ({maxX}, {maxY})
                </div>
                {wasExpanded && (
                  <div className="text-xs text-orange-400 mt-1">
                    Original: ({selMinX}, {selMinY}) → ({selMaxX}, {selMaxY})
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Size</div>
                <div className="font-mono text-sm text-foreground">
                  {width} × {height} = {pixelCount} pixels
                </div>
                {!loadingPrices && (
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    <div>
                      Selected: pay {selectionNewCount + selectionOutbidCount} • free {selectionOwnCount}
                    </div>
                    {wasExpanded && (
                      <div>
                        Added to complete rectangle: pay {addedNewCount + addedOutbidCount} • free {addedOwnCount}
                      </div>
                    )}
                  </div>
                )}
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

          {/* Expanded area warning */}
          {wasExpanded && (
            <div className="p-4 bg-orange-500/20 rounded-lg border border-orange-500/50">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-orange-300">
                    Area expanded to form a rectangle
                  </p>
                  <p className="text-orange-200/80 mt-1">
                    Your selection overlaps with existing rectangles. The purchase area has been expanded from {(selMaxX - selMinX + 1) * (selMaxY - selMinY + 1)} to {pixelCount} pixels to maintain rectangle shape.
                  </p>
                </div>
              </div>
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
                {ownPixelCount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                      {ownPixelCount} owned pixel{ownPixelCount > 1 ? 's' : ''} (free update)
                    </span>
                    <span className="font-mono text-accent">
                      0.0000 SOL
                    </span>
                  </div>
                )}
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
                      {outbidPixelCount} outbid pixel{outbidPixelCount > 1 ? 's' : ''} (prev price + 0.0001 SOL)
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
              ) : totalCost === 0 ? (
                `Update ${pixelCount} Pixels`
              ) : (
                `Pay ${lamportsToSol(totalCost).toFixed(4)} SOL`
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
