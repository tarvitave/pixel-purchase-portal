import { useState, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PixelCanvas } from '@/components/PixelCanvas';
import { PurchaseModal } from '@/components/PurchaseModal';
import { ImagePurchaseModal } from '@/components/ImagePurchaseModal';
import { OutbidBatchModal } from '@/components/OutbidBatchModal';
import { Leaderboard } from '@/components/Leaderboard';
import { MyPlacements } from '@/components/MyPlacements';
import { BrowsePlacements } from '@/components/BrowsePlacements';
import { UpdateLinkDialog } from '@/components/UpdateLinkDialog';
import { ImagePlacementPanel, type ImagePlacementData } from '@/components/ImagePlacementPanel';
import { usePixels, type Pixel } from '@/hooks/usePixels';
import { useImagePlacements, type ImagePlacement } from '@/hooks/useImagePlacements';
import { usePhantom } from '@/hooks/usePhantom';
import { toast } from 'sonner';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { RefreshCw, Edit, Eye, ExternalLink, DollarSign, Info } from 'lucide-react';
import { lamportsToSol } from '@/hooks/usePixels';

const Index = () => {
  const [selectedColor, setSelectedColor] = useState('#A855F7');
  const [selectionMode, setSelectionMode] = useState<'single' | 'rectangle'>('single');
  const [purchaseModal, setPurchaseModal] = useState<{
    open: boolean;
    x: number;
    y: number;
    existingPixel?: Pixel;
  }>({ open: false, x: 0, y: 0 });
  const [imageModal, setImageModal] = useState<{
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
  const [scrollToPlacement, setScrollToPlacement] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [updateLinkDialog, setUpdateLinkDialog] = useState<{ open: boolean; placement: ImagePlacement | null }>({ open: false, placement: null });
  const [contextMenu, setContextMenu] = useState<{ placement: ImagePlacement; x: number; y: number } | null>(null);
  
  const { placementCount, getPlacementAt, pixelsCovered } = useImagePlacements();
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
    
    // If image placement mode is active, open image modal
    if (imagePlacement) {
      const endX = x + imagePlacement.width - 1;
      const endY = y + imagePlacement.height - 1;
      
      setImageModal({ 
        open: true, 
        startX: x, 
        startY: y, 
        endX, 
        endY,
        preloadedImage: imagePlacement.imageSrc,
        preloadedLinkUrl: imagePlacement.linkUrl,
      });
      setImagePlacement(null);
      return;
    }

    // Check if clicking on an existing image placement
    const existingPlacement = getPlacementAt(x, y);
    if (existingPlacement && existingPlacement.link_url) {
      let url = existingPlacement.link_url.trim();
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
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
    
    setImageModal({ open: true, startX, startY, endX, endY });
  };

  const handleImageDrop = (x: number, y: number, imageData: ImagePlacementData) => {
    if (!connected) {
      toast.error('Connect your Phantom wallet to place pixels');
      return;
    }
    
    const endX = x + imageData.width - 1;
    const endY = y + imageData.height - 1;
    
    setImageModal({ 
      open: true, 
      startX: x, 
      startY: y, 
      endX, 
      endY,
      preloadedImage: imageData.imageSrc,
      preloadedLinkUrl: imageData.linkUrl,
    });
  };

  // Context menu handlers
  const handleImageContextMenu = useCallback((placement: ImagePlacement, screenX: number, screenY: number) => {
    setContextMenu({ placement, x: screenX, y: screenY });
  }, []);

  const handleViewPlacement = useCallback((placement: ImagePlacement) => {
    setScrollToPlacement({ x: placement.x, y: placement.y, width: placement.width, height: placement.height });
    // Reset after animation
    setTimeout(() => setScrollToPlacement(null), 100);
  }, []);

  const handleReplacePlacement = useCallback((placement: ImagePlacement) => {
    setImageModal({
      open: true,
      startX: placement.x,
      startY: placement.y,
      endX: placement.x + placement.width - 1,
      endY: placement.y + placement.height - 1,
    });
  }, []);

  const handleEditLink = useCallback((placement: ImagePlacement) => {
    setUpdateLinkDialog({ open: true, placement });
  }, []);

  const handleOutbidPlacement = useCallback((placement: ImagePlacement) => {
    setImageModal({
      open: true,
      startX: placement.x,
      startY: placement.y,
      endX: placement.x + placement.width - 1,
      endY: placement.y + placement.height - 1,
    });
  }, []);

  const handleVisitLink = useCallback((placement: ImagePlacement) => {
    if (!placement.link_url) return;
    let url = placement.link_url.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const isOwner = contextMenu?.placement.owner_wallet === publicKey;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header imageCount={placementCount} pixelsCovered={pixelsCovered} />
      
      {/* Main content */}
      <main className="flex-1 pt-16 flex">
        {/* Canvas area with context menu */}
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className="flex-1 relative">
              <PixelCanvas
                selectedColor={selectedColor}
                onPixelClick={handlePixelClick}
                onRectangleSelect={handleRectangleSelect}
                onImageDrop={handleImageDrop}
                onImageContextMenu={handleImageContextMenu}
                walletConnected={connected}
                selectionMode={selectionMode}
                scrollToPlacement={scrollToPlacement}
              />
            </div>
          </ContextMenuTrigger>
          {contextMenu && (
            <ContextMenuContent className="w-56">
              <ContextMenuLabel className="flex items-center gap-2">
                <Info className="w-3 h-3" />
                Image at ({contextMenu.placement.x}, {contextMenu.placement.y})
              </ContextMenuLabel>
              <div className="px-2 pb-2 text-xs text-muted-foreground">
                {contextMenu.placement.width}×{contextMenu.placement.height} pixels •{' '}
                {lamportsToSol(contextMenu.placement.price_lamports).toFixed(6)} SOL
              </div>
              <ContextMenuSeparator />

              {isOwner ? (
                <>
                  <ContextMenuItem 
                    className="gap-2 cursor-pointer" 
                    onClick={() => {
                      handleReplacePlacement(contextMenu.placement);
                      setContextMenu(null);
                    }}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Replace Image (Free)
                  </ContextMenuItem>
                  <ContextMenuItem 
                    className="gap-2 cursor-pointer" 
                    onClick={() => {
                      handleEditLink(contextMenu.placement);
                      setContextMenu(null);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                    Update Link
                  </ContextMenuItem>
                  <ContextMenuItem 
                    className="gap-2 cursor-pointer" 
                    onClick={() => {
                      handleViewPlacement(contextMenu.placement);
                      setContextMenu(null);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                    View on Canvas
                  </ContextMenuItem>
                </>
              ) : (
                <>
                  <ContextMenuItem 
                    className="gap-2 cursor-pointer" 
                    onClick={() => {
                      handleOutbidPlacement(contextMenu.placement);
                      setContextMenu(null);
                    }}
                  >
                    <DollarSign className="w-4 h-4" />
                    Outbid This Image
                  </ContextMenuItem>
                  {contextMenu.placement.link_url && (
                    <ContextMenuItem 
                      className="gap-2 cursor-pointer" 
                      onClick={() => {
                        handleVisitLink(contextMenu.placement);
                        setContextMenu(null);
                      }}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Visit Link
                    </ContextMenuItem>
                  )}
                  <ContextMenuItem 
                    className="gap-2 cursor-pointer" 
                    onClick={() => {
                      handleViewPlacement(contextMenu.placement);
                      setContextMenu(null);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </ContextMenuItem>
                </>
              )}
            </ContextMenuContent>
          )}
        </ContextMenu>

        {/* Sidebar */}
        <aside className="w-80 bg-card/50 backdrop-blur-sm border-l border-border p-4 flex flex-col gap-4 overflow-y-auto">
          {/* Image Placement Panel */}
          <ImagePlacementPanel
            onImageReady={handleImageReady}
            onCancel={handleImagePlacementCancel}
            isActive={!!imagePlacement}
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
                Upload an image and add a link URL
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">3.</span>
                Drag to position on the 500×500 canvas
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">4.</span>
                Click "Place Image" and pay in SOL
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">5.</span>
                Your image stays forever (or until outbid!)
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

          {/* My Placements */}
          <MyPlacements
            onViewPlacement={handleViewPlacement}
            onReplacePlacement={handleReplacePlacement}
            onEditLink={handleEditLink}
          />

          {/* Browse All Placements */}
          <BrowsePlacements
            onViewPlacement={handleViewPlacement}
            onOutbidPlacement={handleOutbidPlacement}
            onReplacePlacement={handleReplacePlacement}
            onEditLink={handleEditLink}
            onVisitLink={handleVisitLink}
          />

          {/* Leaderboard */}
          <Leaderboard />

          {/* Canvas stats */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">Canvas Stats</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Canvas Size</span>
                <span className="font-mono text-foreground">500 × 500</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Images Placed</span>
                <span className="font-mono text-foreground">{placementCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Pixels Covered</span>
                <span className="font-mono text-foreground">{pixelsCovered.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Available</span>
                <span className="font-mono text-accent">{(250000 - pixelsCovered).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Base Price</span>
                <span className="font-mono text-primary">0.000001 SOL</span>
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

      {/* Image purchase modal */}
      <ImagePurchaseModal
        open={imageModal.open}
        onClose={() => setImageModal({ open: false, startX: 0, startY: 0, endX: 0, endY: 0 })}
        startX={imageModal.startX}
        startY={imageModal.startY}
        endX={imageModal.endX}
        endY={imageModal.endY}
        preloadedImage={imageModal.preloadedImage}
        preloadedLinkUrl={imageModal.preloadedLinkUrl}
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

      {/* Update link dialog */}
      <UpdateLinkDialog
        open={updateLinkDialog.open}
        onClose={() => setUpdateLinkDialog({ open: false, placement: null })}
        placement={updateLinkDialog.placement}
      />

      <Footer />
    </div>
  );
};

export default Index;
