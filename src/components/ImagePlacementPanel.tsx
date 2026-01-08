import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, X, Image as ImageIcon, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

interface ImagePlacementPanelProps {
  onImageReady: (imageData: ImagePlacementData) => void;
  onCancel: () => void;
  isActive: boolean;
}

export interface ImagePlacementData {
  imageSrc: string;
  linkUrl: string;
  width: number;
  height: number;
}

export function ImagePlacementPanel({ onImageReady, onCancel, isActive }: ImagePlacementPanelProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadImage = (src: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      setImagePreview(src);
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    
    img.onerror = () => {
      toast.error('Failed to load image');
      setImagePreview(null);
      setImageDimensions(null);
    };
    
    img.src = src;
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    
    setUploadedFile(file);
    setImageUrl('');
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      loadImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    setUploadedFile(null);
    if (url) {
      loadImage(url);
    } else {
      setImagePreview(null);
      setImageDimensions(null);
    }
  };

  const handleConfirm = () => {
    if (!imagePreview || !imageDimensions) {
      toast.error('Please upload or provide an image first');
      return;
    }
    
    onImageReady({
      imageSrc: imagePreview,
      linkUrl,
      width: imageDimensions.width,
      height: imageDimensions.height,
    });
  };

  const handleClear = () => {
    setImageUrl('');
    setLinkUrl('');
    setImagePreview(null);
    setImageDimensions(null);
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onCancel();
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    if (!imagePreview || !imageDimensions) return;
    
    // Set the drag data
    const data: ImagePlacementData = {
      imageSrc: imagePreview,
      linkUrl,
      width: imageDimensions.width,
      height: imageDimensions.height,
    };
    e.dataTransfer.setData('application/json', JSON.stringify(data));
    e.dataTransfer.effectAllowed = 'copy';
    
    // Create a smaller drag image
    const dragImg = document.createElement('div');
    dragImg.style.width = '60px';
    dragImg.style.height = '60px';
    dragImg.style.background = `url(${imagePreview}) center/contain no-repeat`;
    dragImg.style.border = '2px solid #a855f7';
    dragImg.style.borderRadius = '8px';
    dragImg.style.position = 'absolute';
    dragImg.style.top = '-1000px';
    document.body.appendChild(dragImg);
    e.dataTransfer.setDragImage(dragImg, 30, 30);
    
    // Clean up after drag starts
    setTimeout(() => document.body.removeChild(dragImg), 0);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-primary" />
          Place Image
        </h3>
        {(isActive || imagePreview) && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="h-6 w-6 p-0">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {/* Upload button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Image
        </Button>

        {/* Or divider */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Image URL */}
        <Input
          placeholder="Paste image URL..."
          value={imageUrl}
          onChange={(e) => handleUrlChange(e.target.value)}
          className="text-xs"
        />

        {/* Link URL */}
        <Input
          placeholder="Link URL (optional)"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          className="text-xs"
        />

        {/* Draggable Preview */}
        {imagePreview && imageDimensions && (
          <div className="space-y-2">
            <div 
              draggable
              onDragStart={handleDragStart}
              className="relative aspect-square w-full max-h-32 overflow-hidden rounded-lg border-2 border-dashed border-primary/50 cursor-grab active:cursor-grabbing hover:border-primary transition-colors group"
            >
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-full object-contain bg-muted pointer-events-none"
                draggable={false}
              />
              <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="bg-card/90 backdrop-blur-sm px-2 py-1 rounded flex items-center gap-1 text-xs text-primary">
                  <GripVertical className="w-3 h-3" />
                  Drag to canvas
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground text-center">
              {imageDimensions.width} × {imageDimensions.height} pixels
            </div>
          </div>
        )}

        {/* Alternative: Click to place button */}
        {imagePreview && imageDimensions && (
          <Button
            onClick={handleConfirm}
            variant="outline"
            className="w-full"
            size="sm"
          >
            Or Click Canvas to Place
          </Button>
        )}

        {isActive && (
          <div className="text-xs text-center text-primary animate-pulse">
            Click on the canvas where you want to place the top-left corner
          </div>
        )}
      </div>
    </div>
  );
}
