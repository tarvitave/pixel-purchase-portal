import { useState, useMemo } from 'react';
import { useImagePlacements, type ImagePlacement } from '@/hooks/useImagePlacements';
import { usePhantom } from '@/hooks/usePhantom';
import { lamportsToSol } from '@/hooks/usePixels';
import { ChevronDown, ChevronRight, MapPin, Edit, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface MyPlacementsProps {
  onViewPlacement: (placement: ImagePlacement) => void;
  onReplacePlacement: (placement: ImagePlacement) => void;
  onEditLink: (placement: ImagePlacement) => void;
}

export function MyPlacements({ onViewPlacement, onReplacePlacement, onEditLink }: MyPlacementsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { placements } = useImagePlacements();
  const { publicKey, connected } = usePhantom();

  // Filter placements by current wallet - memoize based on publicKey
  // Must be called before any conditional returns (Rules of Hooks)
  const myPlacements = useMemo(() => {
    if (!publicKey) return [];
    return placements.filter(p => 
      p.owner_wallet.toLowerCase() === publicKey.toLowerCase()
    );
  }, [placements, publicKey]);

  if (!connected || !publicKey || myPlacements.length === 0) {
    return null;
  }

  if (myPlacements.length === 0) {
    return null;
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <span className="text-primary">🖼️</span>
          My Placements ({myPlacements.length})
        </h3>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-border max-h-[300px] overflow-y-auto">
          {myPlacements.map((placement) => (
            <div
              key={placement.id}
              className="p-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
            >
              <div className="flex gap-3">
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded bg-muted overflow-hidden flex-shrink-0">
                  <img
                    src={placement.image_url}
                    alt="Placement"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.svg';
                    }}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground">
                    {placement.width}×{placement.height} at ({placement.x}, {placement.y})
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(placement.created_at), 'MMM d, yyyy')}
                  </div>
                  <div className="text-xs text-primary font-medium mt-0.5">
                    {lamportsToSol(placement.price_lamports).toFixed(6)} SOL
                  </div>
                  {placement.link_url && (
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      🔗 {placement.link_url}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={() => onViewPlacement(placement)}
                >
                  <MapPin className="w-3 h-3 mr-1" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={() => onReplacePlacement(placement)}
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Replace
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={() => onEditLink(placement)}
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Link
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
