import { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PixelCanvas } from '@/components/PixelCanvas';
import { ColorPicker } from '@/components/ColorPicker';
import { PurchaseModal } from '@/components/PurchaseModal';
import { BulkPurchaseModal } from '@/components/BulkPurchaseModal';
import { OutbidBatchModal } from '@/components/OutbidBatchModal';
import { Leaderboard } from '@/components/Leaderboard';
import { ImagePlacementPanel, type ImagePlacementData } from '@/components/ImagePlacementPanel';
import { usePixels, type Pixel } from '@/hooks/usePixels';
import { usePhantom } from '@/hooks/usePhantom';
import { toast } from 'sonner';

const Index = () => {
  const [selectedColor, setSelectedColor] = useState('#A855F7');
  const [selectionMode, setSelectionMode] = useState<'single' | 'rectangle'>('single');
  const [purchaseModal, setPurchaseModal] = useState<{
    open: boolean;
    x: number;
    y: number;
    existingPixel?: Pixel;
  }>({ open: false, x: 0, y: 0 });
  const [bulkModal, setBulkModal] = useState<{
    open: boolean;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    preloadedImage?: string;
    preloadedLinkUrl?: string;
  }>({ open: false, startX: 0, startY: 0, endX: 0, endY: 0 });
  const [batchOutbidModal, setBatchOutbidModal] = useState<{
    open: boolean;
    batchId: string;
    clickedPixel: Pixel | null;
  }>({ open: false, batchId: '', clickedPixel: null });
  const [imagePlacement, setImagePlacement] = useState<ImagePlacementData | null>(null);
  
  const { pixelCount } = usePixels();
  const { connected, publicKey } = usePhantom();

  const handleImageReady = (data: ImagePlacementData) => {
    setImagePlacement(data);
    setSelectionMode('single'); // Switch to single mode for clicking
    toast.info('Click on the canvas to place your image');
  };

  const handleImagePlacementCancel = () => {
    setImagePlacement(null);
  };

  const handlePixelClick = (x: number, y: number, existingPixel: Pixel | undefined) => {
    if (!connected) {
      toast.error('Connect your Phantom wallet to place pixels');
      return;
    }
    
    // If image placement mode is active, open bulk modal with the image
    if (imagePlacement) {
      const endX = x + imagePlacement.width - 1;
      const endY = y + imagePlacement.height - 1;
      
      // Store the image data for the bulk modal
      setBulkModal({ 
        open: true, 
        startX: x, 
        startY: y, 
        endX, 
        endY,
        preloadedImage: imagePlacement.imageSrc,
        preloadedLinkUrl: imagePlacement.linkUrl,
      });
      setImagePlacement(null); // Clear placement mode
      return;
    }
    
    // If pixel has a batch_id and is owned by someone else, show batch outbid modal
    if (existingPixel?.batch_id && existingPixel.owner_wallet !== publicKey) {
      setBatchOutbidModal({ 
        open: true, 
        batchId: existingPixel.batch_id, 
        clickedPixel: existingPixel 
      });
      return;
    }
    
    // Otherwise show regular purchase modal
    setPurchaseModal({ open: true, x, y, existingPixel });
  };

  const handleRectangleSelect = (startX: number, startY: number, endX: number, endY: number) => {
    if (!connected) {
      toast.error('Connect your Phantom wallet to place pixels');
      return;
    }
    
    setBulkModal({ open: true, startX, startY, endX, endY });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header pixelCount={pixelCount} />
      
      {/* Main content */}
      <main className="flex-1 pt-16 flex">
        {/* Canvas area */}
        <div className="flex-1 relative">
          <PixelCanvas
            selectedColor={selectedColor}
            onPixelClick={handlePixelClick}
            onRectangleSelect={handleRectangleSelect}
            walletConnected={connected}
            selectionMode={selectionMode}
          />
          
          {/* Selection mode toggle */}
          <div className="absolute top-4 right-20 flex bg-card/95 backdrop-blur-sm border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setSelectionMode('single')}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                selectionMode === 'single'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Single
            </button>
            <button
              onClick={() => setSelectionMode('rectangle')}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                selectionMode === 'rectangle'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Rectangle
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="w-80 bg-card/50 backdrop-blur-sm border-l border-border p-4 flex flex-col gap-4 overflow-y-auto">
          {/* Image Placement Panel */}
          <ImagePlacementPanel
            onImageReady={handleImageReady}
            onCancel={handleImagePlacementCancel}
            isActive={!!imagePlacement}
          />

          <ColorPicker
            selectedColor={selectedColor}
            onColorChange={setSelectedColor}
          />

          {/* Instructions */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">How it Works</h3>
            <ol className="space-y-2 text-xs text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary font-bold">1.</span>
                Connect your Phantom wallet
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">2.</span>
                Select a color or use Rectangle mode
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">3.</span>
                Click pixel or drag to select area
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">4.</span>
                For bulk: paste an image URL
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">5.</span>
                Pay 0.0001 SOL per pixel
              </li>
            </ol>
          </div>

          {/* x402 Protocol info */}
          <div className="bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/30 rounded-xl p-4">
            <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <span className="text-primary">⚡</span>
              HTTP x402 Protocol
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This canvas uses the x402 protocol for native web payments. 
              Each pixel purchase is a micropayment secured by Solana's 
              lightning-fast blockchain.
            </p>
          </div>

          {/* Leaderboard */}
          <Leaderboard />

          {/* Canvas stats */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">Canvas Stats</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Canvas Size</span>
                <span className="font-mono text-foreground">1000 × 1000</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Pixels Claimed</span>
                <span className="font-mono text-foreground">{pixelCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Available</span>
                <span className="font-mono text-accent">{(1000000 - pixelCount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Base Price</span>
                <span className="font-mono text-primary">0.0001 SOL</span>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Purchase modal */}
      <PurchaseModal
        open={purchaseModal.open}
        onClose={() => setPurchaseModal({ open: false, x: 0, y: 0 })}
        x={purchaseModal.x}
        y={purchaseModal.y}
        color={selectedColor}
        existingPixel={purchaseModal.existingPixel}
      />

      {/* Bulk purchase modal */}
      <BulkPurchaseModal
        open={bulkModal.open}
        onClose={() => setBulkModal({ open: false, startX: 0, startY: 0, endX: 0, endY: 0 })}
        startX={bulkModal.startX}
        startY={bulkModal.startY}
        endX={bulkModal.endX}
        endY={bulkModal.endY}
        preloadedImage={bulkModal.preloadedImage}
        preloadedLinkUrl={bulkModal.preloadedLinkUrl}
      />

      {/* Batch outbid modal */}
      {batchOutbidModal.clickedPixel && (
        <OutbidBatchModal
          open={batchOutbidModal.open}
          onClose={() => setBatchOutbidModal({ open: false, batchId: '', clickedPixel: null })}
          batchId={batchOutbidModal.batchId}
          clickedPixel={batchOutbidModal.clickedPixel}
        />
      )}

      <Footer />
    </div>
  );
};

export default Index;
