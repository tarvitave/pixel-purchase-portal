import { useState, useMemo } from 'react';
import { useImagePlacements, ImagePlacement } from '@/hooks/useImagePlacements';
import { usePhantom } from '@/hooks/usePhantom';
import { Button } from '@/components/ui/button';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronDown, Eye, Repeat, Link, ExternalLink, DollarSign, Images } from 'lucide-react';
import { format } from 'date-fns';

interface BrowsePlacementsProps {
  onViewPlacement: (placement: ImagePlacement) => void;
  onOutbidPlacement: (placement: ImagePlacement) => void;
  onReplacePlacement: (placement: ImagePlacement) => void;
  onEditLink: (placement: ImagePlacement) => void;
  onVisitLink: (placement: ImagePlacement) => void;
}

type SortOption = 'recent' | 'price' | 'size';

const lamportsToSol = (lamports: number) => (lamports / 1_000_000_000).toFixed(6);

const truncateWallet = (wallet: string) => 
  `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;

const truncateUrl = (url: string, maxLength = 25) => {
  if (url.length <= maxLength) return url;
  return url.slice(0, maxLength) + '...';
};

export function BrowsePlacements({
  onViewPlacement,
  onOutbidPlacement,
  onReplacePlacement,
  onEditLink,
  onVisitLink,
}: BrowsePlacementsProps) {
  const { placements, loading } = useImagePlacements();
  const { publicKey } = usePhantom();
  const [isOpen, setIsOpen] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  const sortedPlacements = useMemo(() => {
    const sorted = [...placements];
    switch (sortBy) {
      case 'recent':
        return sorted.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case 'price':
        return sorted.sort((a, b) => b.price_lamports - a.price_lamports);
      case 'size':
        return sorted.sort((a, b) => 
          (b.width * b.height) - (a.width * a.height)
        );
      default:
        return sorted;
    }
  }, [placements, sortBy]);

  const isOwned = (placement: ImagePlacement) => 
    publicKey && placement.owner_wallet === publicKey;

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Images className="h-4 w-4" />
          <span>Loading placements...</span>
        </div>
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="bg-card rounded-lg border border-border">
        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2">
            <Images className="h-4 w-4 text-primary" />
            <span className="font-medium">Browse Placements</span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {placements.length}
            </span>
          </div>
          <ChevronDown 
            className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          />
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            {placements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No images placed yet. Be the first!
              </p>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Sort by:</span>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                    <SelectTrigger className="h-8 text-xs w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Most Recent</SelectItem>
                      <SelectItem value="price">Highest Price</SelectItem>
                      <SelectItem value="size">Largest Size</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {sortedPlacements.map((placement) => {
                    const owned = isOwned(placement);
                    return (
                      <div 
                        key={placement.id} 
                        className={`border rounded-lg p-3 space-y-2 ${
                          owned 
                            ? 'border-primary/50 bg-primary/5' 
                            : 'border-border bg-background'
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="w-16 h-16 rounded overflow-hidden bg-muted flex-shrink-0">
                            <img 
                              src={placement.image_url} 
                              alt="Placement" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">
                                {placement.width}×{placement.height}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                at ({placement.x}, {placement.y})
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-1 text-xs">
                              <span className="text-muted-foreground">Owner:</span>
                              {owned ? (
                                <span className="text-primary font-medium">You ✓</span>
                              ) : (
                                <span className="font-mono text-muted-foreground">
                                  {truncateWallet(placement.owner_wallet)}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1 text-xs">
                              <DollarSign className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">
                                {lamportsToSol(placement.price_lamports)} SOL
                              </span>
                            </div>
                            
                            {placement.link_url && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Link className="h-3 w-3" />
                                <span className="truncate">
                                  {truncateUrl(placement.link_url)}
                                </span>
                              </div>
                            )}
                            
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(placement.created_at), 'MMM d, yyyy')}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs flex-1"
                            onClick={() => onViewPlacement(placement)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          
                          {owned ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs flex-1"
                                onClick={() => onReplacePlacement(placement)}
                              >
                                <Repeat className="h-3 w-3 mr-1" />
                                Replace
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs flex-1"
                                onClick={() => onEditLink(placement)}
                              >
                                <Link className="h-3 w-3 mr-1" />
                                Link
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                className="h-7 text-xs flex-1"
                                onClick={() => onOutbidPlacement(placement)}
                              >
                                <DollarSign className="h-3 w-3 mr-1" />
                                Outbid
                              </Button>
                              {placement.link_url && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs flex-1"
                                  onClick={() => onVisitLink(placement)}
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  Visit
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
