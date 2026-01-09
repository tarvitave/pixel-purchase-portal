import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface ImagePlacement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  image_url: string;
  link_url: string | null;
  owner_wallet: string;
  price_lamports: number;
  transaction_signature: string | null;
  created_at: string;
  updated_at: string;
}

export function useImagePlacements() {
  const [placements, setPlacements] = useState<ImagePlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all placements on mount
  useEffect(() => {
    const fetchPlacements = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('image_placements')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) throw error;
        
        setPlacements(data || []);
      } catch (err) {
        console.error('Failed to fetch image placements:', err);
        setError('Failed to load image placements');
      } finally {
        setLoading(false);
      }
    };

    fetchPlacements();
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('image-placements-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'image_placements',
        },
        (payload: RealtimePostgresChangesPayload<ImagePlacement>) => {
          console.log('Image placement update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const placement = payload.new as ImagePlacement;
            setPlacements((prev) => [...prev, placement]);
          } else if (payload.eventType === 'UPDATE') {
            const placement = payload.new as ImagePlacement;
            setPlacements((prev) => 
              prev.map((p) => p.id === placement.id ? placement : p)
            );
          } else if (payload.eventType === 'DELETE') {
            const placement = payload.old as ImagePlacement;
            setPlacements((prev) => prev.filter((p) => p.id !== placement.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Create a spatial lookup map for O(1) placement checks
  const placementMap = useMemo(() => {
    const map = new Map<string, ImagePlacement>();
    placements.forEach(p => {
      for (let px = p.x; px < p.x + p.width; px++) {
        for (let py = p.y; py < p.y + p.height; py++) {
          map.set(`${px},${py}`, p);
        }
      }
    });
    return map;
  }, [placements]);

  const getPlacementAt = useCallback((x: number, y: number): ImagePlacement | undefined => {
    return placementMap.get(`${x},${y}`);
  }, [placementMap]);

  const getOverlappingPlacements = useCallback((
    x: number, y: number, width: number, height: number
  ): ImagePlacement[] => {
    return placements.filter(p => {
      const overlapX = Math.max(x, p.x) < Math.min(x + width, p.x + p.width);
      const overlapY = Math.max(y, p.y) < Math.min(y + height, p.y + p.height);
      return overlapX && overlapY;
    });
  }, [placements]);

  // Calculate total pixels covered by all placements
  const pixelsCovered = placements.reduce((total, p) => total + (p.width * p.height), 0);

  return {
    placements,
    loading,
    error,
    getPlacementAt,
    getOverlappingPlacements,
    placementCount: placements.length,
    pixelsCovered,
  };
}
