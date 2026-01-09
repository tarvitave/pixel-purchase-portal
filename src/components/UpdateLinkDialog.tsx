import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ImagePlacement } from '@/hooks/useImagePlacements';

interface UpdateLinkDialogProps {
  open: boolean;
  onClose: () => void;
  placement: ImagePlacement | null;
}

export function UpdateLinkDialog({ open, onClose, placement }: UpdateLinkDialogProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (placement) {
      setLinkUrl(placement.link_url || '');
    }
  }, [placement]);

  const handleUpdate = async () => {
    if (!placement) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('image_placements')
        .update({ link_url: linkUrl || null })
        .eq('id', placement.id);

      if (error) throw error;

      toast.success('Link updated successfully!');
      onClose();
    } catch (err) {
      console.error('Failed to update link:', err);
      toast.error('Failed to update link');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Link</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {placement && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <img
                src={placement.image_url}
                alt="Placement"
                className="w-12 h-12 rounded object-cover"
              />
              <div className="text-sm">
                <div className="font-medium">
                  {placement.width}×{placement.height} pixels
                </div>
                <div className="text-muted-foreground">
                  at ({placement.x}, {placement.y})
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="link-url">Link URL</Label>
            <Input
              id="link-url"
              type="url"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Users will be redirected here when they click your image
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUpdating}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={isUpdating}>
            {isUpdating ? 'Updating...' : 'Update Link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
