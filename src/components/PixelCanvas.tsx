import { useRef, useEffect, useState, useCallback, DragEvent } from 'react';
import { usePixels, type Pixel, getMinBidLamports, lamportsToSol } from '@/hooks/usePixels';
import type { ImagePlacementData } from './ImagePlacementPanel';

interface PixelCanvasProps {
  selectedColor: string;
  onPixelClick: (x: number, y: number, existingPixel: Pixel | undefined) => void;
  onRectangleSelect?: (startX: number, startY: number, endX: number, endY: number) => void;
  onImageDrop?: (x: number, y: number, imageData: ImagePlacementData) => void;
  walletConnected: boolean;
  selectionMode?: 'single' | 'rectangle';
}

const CANVAS_SIZE = 1000;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 40;
const DEFAULT_ZOOM = 2;
const MINIMAP_SIZE = 150;

export function PixelCanvas({ 
  selectedColor, 
  onPixelClick, 
  onRectangleSelect,
  onImageDrop,
  walletConnected,
  selectionMode = 'single'
}: PixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredPixel, setHoveredPixel] = useState<{ x: number; y: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const [minimapExpanded, setMinimapExpanded] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const { pixels, loading, getPixel, getPixelColor } = usePixels();

  // Draw the canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas with background color
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, width, height);

    // Calculate visible area
    const pixelSize = zoom;
    const startX = Math.floor(-offset.x / pixelSize);
    const startY = Math.floor(-offset.y / pixelSize);
    const endX = Math.ceil((width - offset.x) / pixelSize);
    const endY = Math.ceil((height - offset.y) / pixelSize);

    // Draw grid lines if zoomed in enough
    if (zoom >= 4) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 0.5;

      for (let x = Math.max(0, startX); x <= Math.min(CANVAS_SIZE, endX); x++) {
        const screenX = x * pixelSize + offset.x;
        ctx.beginPath();
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, height);
        ctx.stroke();
      }

      for (let y = Math.max(0, startY); y <= Math.min(CANVAS_SIZE, endY); y++) {
        const screenY = y * pixelSize + offset.y;
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(width, screenY);
        ctx.stroke();
      }
    }

    // Draw pixels
    for (let x = Math.max(0, startX); x < Math.min(CANVAS_SIZE, endX); x++) {
      for (let y = Math.max(0, startY); y < Math.min(CANVAS_SIZE, endY); y++) {
        const color = getPixelColor(x, y);
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(
            x * pixelSize + offset.x,
            y * pixelSize + offset.y,
            pixelSize,
            pixelSize
          );
        }
      }
    }

    // Draw hovered pixel highlight
    if (hoveredPixel && walletConnected && selectionMode === 'single') {
      const { x, y } = hoveredPixel;
      if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
        ctx.strokeStyle = selectedColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(
          x * pixelSize + offset.x,
          y * pixelSize + offset.y,
          pixelSize,
          pixelSize
        );

        // Preview color
        ctx.fillStyle = selectedColor;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(
          x * pixelSize + offset.x,
          y * pixelSize + offset.y,
          pixelSize,
          pixelSize
        );
        ctx.globalAlpha = 1;
      }
    }

    // Draw rectangle selection preview
    if (selectionMode === 'rectangle' && selectionStart && (selectionEnd || hoveredPixel)) {
      const end = selectionEnd || hoveredPixel;
      if (end) {
        const minX = Math.min(selectionStart.x, end.x);
        const maxX = Math.max(selectionStart.x, end.x);
        const minY = Math.min(selectionStart.y, end.y);
        const maxY = Math.max(selectionStart.y, end.y);
        
        ctx.fillStyle = selectedColor;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(
          minX * pixelSize + offset.x,
          minY * pixelSize + offset.y,
          (maxX - minX + 1) * pixelSize,
          (maxY - minY + 1) * pixelSize
        );
        ctx.globalAlpha = 1;
        
        ctx.strokeStyle = selectedColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
          minX * pixelSize + offset.x,
          minY * pixelSize + offset.y,
          (maxX - minX + 1) * pixelSize,
          (maxY - minY + 1) * pixelSize
        );
        ctx.setLineDash([]);
      }
    }

    // Draw canvas boundary
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(offset.x, offset.y, CANVAS_SIZE * pixelSize, CANVAS_SIZE * pixelSize);
  }, [zoom, offset, pixels, hoveredPixel, selectedColor, walletConnected, getPixelColor, selectionMode, selectionStart, selectionEnd]);

  // Draw the minimap
  const drawMinimap = useCallback(() => {
    const minimap = minimapRef.current;
    const mainCanvas = canvasRef.current;
    if (!minimap || !mainCanvas) return;

    const ctx = minimap.getContext('2d');
    if (!ctx) return;

    const scale = MINIMAP_SIZE / CANVAS_SIZE;

    // Clear minimap with dark background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    // Draw all pixels on minimap
    Object.values(pixels).forEach((pixel) => {
      ctx.fillStyle = pixel.color;
      // Draw each pixel as at least 1px on minimap, slightly larger for visibility
      const size = Math.max(1, scale);
      ctx.fillRect(
        Math.floor(pixel.x * scale),
        Math.floor(pixel.y * scale),
        size,
        size
      );
    });

    // Draw viewport rectangle
    const viewportX = -offset.x / zoom;
    const viewportY = -offset.y / zoom;
    const viewportWidth = mainCanvas.width / zoom;
    const viewportHeight = mainCanvas.height / zoom;

    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      viewportX * scale,
      viewportY * scale,
      viewportWidth * scale,
      viewportHeight * scale
    );

    // Draw canvas boundary
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
  }, [pixels, offset, zoom]);

  // Resize canvas to fit container
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;

      // Center the canvas initially
      if (offset.x === 0 && offset.y === 0) {
        setOffset({
          x: (canvas.width - CANVAS_SIZE * zoom) / 2,
          y: (canvas.height - CANVAS_SIZE * zoom) / 2,
        });
      }

      draw();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw, zoom, offset.x, offset.y]);

  // Redraw when dependencies change
  useEffect(() => {
    draw();
    drawMinimap();
  }, [draw, drawMinimap]);

  // Convert screen coordinates to pixel coordinates (returns null if outside the board)
  const screenToPixel = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((screenX - rect.left - offset.x) / zoom);
    const y = Math.floor((screenY - rect.top - offset.y) / zoom);

    if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
      return { x, y };
    }
    return null;
  }, [offset, zoom]);

  // Like screenToPixel, but clamps to the nearest valid pixel.
  // This prevents rectangle selections from "failing" when the pointer leaves the board bounds.
  const screenToPixelClamped = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const rawX = Math.floor((screenX - rect.left - offset.x) / zoom);
    const rawY = Math.floor((screenY - rect.top - offset.y) / zoom);

    const x = Math.max(0, Math.min(CANVAS_SIZE - 1, rawX));
    const y = Math.max(0, Math.min(CANVAS_SIZE - 1, rawY));

    return { x, y };
  }, [offset, zoom]);

  // Pointer handlers (pointer capture keeps drag/select working even if the pointer leaves the canvas)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;

    // Keep receiving move/up events even if the pointer leaves the element
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // no-op (some environments may throw)
    }

    if (selectionMode === 'rectangle') {
      const pixel = screenToPixel(e.clientX, e.clientY);
      if (pixel) {
        setIsSelecting(true);
        setSelectionStart(pixel);
        setSelectionEnd(pixel); // ensure we always have a valid end pixel
        setIsDragging(false);
        return;
      }
    }

    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pixel = screenToPixel(e.clientX, e.clientY);
    setHoveredPixel(pixel);

    if (isSelecting && selectionMode === 'rectangle') {
      const endPixel = screenToPixelClamped(e.clientX, e.clientY);
      if (endPixel) setSelectionEnd(endPixel);
      return;
    }

    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // no-op
    }

    if (isSelecting && selectionMode === 'rectangle') {
      setIsSelecting(false);
      const endPixel = selectionEnd || screenToPixelClamped(e.clientX, e.clientY);

      if (selectionStart && endPixel && onRectangleSelect) {
        onRectangleSelect(selectionStart.x, selectionStart.y, endPixel.x, endPixel.y);
      }

      setSelectionStart(null);
      setSelectionEnd(null);
      return;
    }

    if (isDragging) {
      setIsDragging(false);
      // Check if it was a click (not a drag)
      const dx = Math.abs(e.clientX - dragStart.x - offset.x);
      const dy = Math.abs(e.clientY - dragStart.y - offset.y);

      if (dx < 5 && dy < 5 && selectionMode === 'single') {
        const clicked = screenToPixel(e.clientX, e.clientY);
        if (clicked) {
          const existingPixel = getPixel(clicked.x, clicked.y);
          // If pixel has a link, open it instead of showing purchase modal
          if (existingPixel?.link_url) {
            let url = existingPixel.link_url.trim();
            // Add protocol if missing
            if (!/^https?:\/\//i.test(url)) {
              url = 'https://' + url;
            }
            console.log('Opening URL:', url);
            window.open(url, '_blank', 'noopener,noreferrer');
            return;
          }
          onPixelClick(clicked.x, clicked.y, existingPixel);
        }
      }
    }
  };

  const handlePointerCancel = () => {
    setIsDragging(false);
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const handlePointerLeave = () => {
    setHoveredPixel(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.2 : 0.8;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * zoomFactor));

    // Zoom towards mouse position
    const scale = newZoom / zoom;
    setOffset({
      x: mouseX - (mouseX - offset.x) * scale,
      y: mouseY - (mouseY - offset.y) * scale,
    });
    setZoom(newZoom);
  };

  // Drag and drop handlers for image placement
  const handleDragOver = (e: DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
    
    // Update hovered pixel for preview
    const pixel = screenToPixel(e.clientX, e.clientY);
    setHoveredPixel(pixel);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const jsonData = e.dataTransfer.getData('application/json');
    if (!jsonData || !onImageDrop) return;
    
    try {
      const imageData: ImagePlacementData = JSON.parse(jsonData);
      const pixel = screenToPixel(e.clientX, e.clientY);
      
      if (pixel) {
        onImageDrop(pixel.x, pixel.y, imageData);
      }
    } catch (err) {
      console.error('Failed to parse drop data:', err);
    }
  };

  // Get hovered pixel info for tooltip
  const hoveredPixelData = hoveredPixel ? getPixel(hoveredPixel.x, hoveredPixel.y) : undefined;

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full overflow-hidden bg-canvas-bg cursor-crosshair"
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerLeave}
        onWheel={handleWheel}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={(isDragging ? 'cursor-grabbing' : 'cursor-crosshair') + ' touch-none select-none'}
      />
      
      {/* Drop zone overlay */}
      {isDragOver && (
        <div className="absolute inset-0 pointer-events-none bg-primary/10 border-4 border-dashed border-primary animate-pulse flex items-center justify-center">
          <div className="bg-card/90 backdrop-blur-sm px-4 py-2 rounded-lg text-primary font-medium">
            Drop to place image at ({hoveredPixel?.x ?? 0}, {hoveredPixel?.y ?? 0})
          </div>
        </div>
      )}
      
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Loading canvas...</span>
          </div>
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => setZoom(Math.min(MAX_ZOOM, zoom * 1.5))}
          className="w-10 h-10 bg-card border border-border rounded-lg flex items-center justify-center text-foreground hover:bg-muted transition-colors text-lg font-bold"
        >
          +
        </button>
        <button
          onClick={() => setZoom(Math.max(MIN_ZOOM, zoom / 1.5))}
          className="w-10 h-10 bg-card border border-border rounded-lg flex items-center justify-center text-foreground hover:bg-muted transition-colors text-lg font-bold"
        >
          -
        </button>
        <button
          onClick={() => {
            setZoom(DEFAULT_ZOOM);
            const canvas = canvasRef.current;
            if (canvas) {
              setOffset({
                x: (canvas.width - CANVAS_SIZE * DEFAULT_ZOOM) / 2,
                y: (canvas.height - CANVAS_SIZE * DEFAULT_ZOOM) / 2,
              });
            }
          }}
          className="w-10 h-10 bg-card border border-border rounded-lg flex items-center justify-center text-foreground hover:bg-muted transition-colors text-xs"
        >
          ⌂
        </button>
        <button
          onClick={() => {
            // Jump to top-left where recent pixels are
            const targetZoom = 10;
            setZoom(targetZoom);
            const canvas = canvasRef.current;
            if (canvas) {
              // Center on coordinates (27, 29) - where recent pixels are
              setOffset({
                x: canvas.width / 2 - 27 * targetZoom,
                y: canvas.height / 2 - 29 * targetZoom,
              });
            }
          }}
          className="w-10 h-10 bg-card border border-border rounded-lg flex items-center justify-center text-foreground hover:bg-muted transition-colors text-xs"
          title="Jump to recent pixels"
        >
          📍
        </button>
      </div>

      {/* Pixel info tooltip */}
      {hoveredPixel && (
        <div className="absolute top-4 left-4 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 min-w-[200px]">
          <div className="text-xs text-muted-foreground mb-1">Coordinates</div>
          <div className="font-mono text-sm mb-2">
            ({hoveredPixel.x}, {hoveredPixel.y})
          </div>
          
          {hoveredPixelData ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-4 h-4 rounded border border-border"
                  style={{ backgroundColor: hoveredPixelData.color }}
                />
                <span className="text-xs font-mono">{hoveredPixelData.color}</span>
              </div>
              {hoveredPixelData.link_url && (
                <div className="mb-2 p-2 bg-primary/10 rounded border border-primary/20">
                  <div className="text-xs text-muted-foreground mb-1">🔗 Link</div>
                  <div className="text-xs text-primary font-medium break-all max-w-[180px]">
                    {hoveredPixelData.link_url}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">Click pixel to visit</div>
                </div>
              )}
              <div className="text-xs text-muted-foreground mb-1">Current price</div>
              <div className="text-sm text-primary font-bold">
                {lamportsToSol(hoveredPixelData.price_lamports).toFixed(4)} SOL
              </div>
              <div className="text-xs text-muted-foreground mt-2">Min bid to own</div>
              <div className="text-sm text-accent font-bold">
                {lamportsToSol(getMinBidLamports(hoveredPixelData.price_lamports)).toFixed(4)} SOL
              </div>
            </>
          ) : (
            <>
              <div className="text-xs text-muted-foreground mb-1">Status</div>
              <div className="text-sm text-accent">Available!</div>
              <div className="text-xs text-muted-foreground mt-2">Price</div>
              <div className="text-sm text-primary font-bold">0.00001 SOL</div>
            </>
          )}
        </div>
      )}

      {/* Zoom level indicator */}
      <div className="absolute bottom-4 left-4 bg-card/80 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5">
        <span className="text-xs text-muted-foreground">Zoom: </span>
        <span className="text-sm font-mono">{zoom.toFixed(1)}x</span>
      </div>

      {/* Minimap */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
        <button
          onClick={() => setMinimapExpanded(!minimapExpanded)}
          className="bg-card/90 backdrop-blur-sm border border-border rounded-lg px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {minimapExpanded ? '▼ Hide Map' : '▶ Show Map'}
        </button>
        {minimapExpanded && (
          <div 
            className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-2 cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left - 8; // account for padding
              const clickY = e.clientY - rect.top - 8;
              
              const scale = MINIMAP_SIZE / CANVAS_SIZE;
              const targetX = clickX / scale;
              const targetY = clickY / scale;
              
              const canvas = canvasRef.current;
              if (canvas) {
                setOffset({
                  x: canvas.width / 2 - targetX * zoom,
                  y: canvas.height / 2 - targetY * zoom,
                });
              }
            }}
          >
            <canvas
              ref={minimapRef}
              width={MINIMAP_SIZE}
              height={MINIMAP_SIZE}
              className="rounded"
              style={{ imageRendering: 'pixelated' }}
            />
            <div className="text-xs text-muted-foreground text-center mt-1">
              Click to navigate
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
