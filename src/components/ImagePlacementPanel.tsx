import { useState, useRef, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
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

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-primary" />
          Place Image
        </h3>
        {isActive && (
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

        {/* Preview */}
        {imagePreview && imageDimensions && (
          <div className="space-y-2">
            <div className="relative aspect-square w-full max-h-32 overflow-hidden rounded-lg border border-border">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-full object-contain bg-muted"
              />
            </div>
            <div className="text-xs text-muted-foreground text-center">
              {imageDimensions.width} × {imageDimensions.height} pixels
            </div>
          </div>
        )}

        {/* Confirm button */}
        {imagePreview && imageDimensions && (
          <Button
            onClick={handleConfirm}
            className="w-full"
            size="sm"
          >
            Click Canvas to Place
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
