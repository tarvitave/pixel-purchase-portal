import { useState } from 'react';
import { Header } from '@/components/Header';
import { PixelCanvas } from '@/components/PixelCanvas';
import { ColorPicker } from '@/components/ColorPicker';
import { PurchaseModal } from '@/components/PurchaseModal';
import { usePixels, type Pixel } from '@/hooks/usePixels';
import { usePhantom } from '@/hooks/usePhantom';
import { toast } from 'sonner';

const Index = () => {
  const [selectedColor, setSelectedColor] = useState('#A855F7');
  const [purchaseModal, setPurchaseModal] = useState<{
    open: boolean;
    x: number;
    y: number;
    existingPixel?: Pixel;
  }>({ open: false, x: 0, y: 0 });
  
  const { pixelCount } = usePixels();
  const { connected } = usePhantom();

  const handlePixelClick = (x: number, y: number, existingPixel: Pixel | undefined) => {
    if (!connected) {
      toast.error('Connect your Phantom wallet to place pixels');
      return;
    }
    
    setPurchaseModal({ open: true, x, y, existingPixel });
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
            walletConnected={connected}
          />
        </div>

        {/* Sidebar */}
        <aside className="w-80 bg-card/50 backdrop-blur-sm border-l border-border p-4 flex flex-col gap-4 overflow-y-auto">
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
                Select a color from the palette
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">3.</span>
                Click on any pixel to claim it
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">4.</span>
                Pay 0.001 SOL (~$0.15) per pixel
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">5.</span>
                Outbid others to take their pixels!
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
                <span className="font-mono text-primary">0.001 SOL</span>
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
    </div>
  );
};

export default Index;
