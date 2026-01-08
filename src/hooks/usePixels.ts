import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface Pixel {
  id: string;
  x: number;
  y: number;
  color: string;
  owner_wallet: string | null;
  price_lamports: number;
  transaction_signature: string | null;
  link_url: string | null;
  batch_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PixelMap {
  [key: string]: Pixel;
}

const LAMPORTS_PER_SOL = 1_000_000_000;
const BASE_PRICE_LAMPORTS = 100_000; // 0.0001 SOL

export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

export function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}

export function getMinBidLamports(currentPriceLamports: number | null): number {
  if (!currentPriceLamports) return BASE_PRICE_LAMPORTS;
  // Minimum bid is 10% more than current price
  return Math.floor(currentPriceLamports * 1.1);
}

export function usePixels() {
  const [pixels, setPixels] = useState<PixelMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create a key for pixel lookup
  const getPixelKey = (x: number, y: number) => `${x},${y}`;

  // Fetch all pixels on mount
  useEffect(() => {
    const fetchPixels = async () => {
      try {
        setLoading(true);
        console.log('Fetching pixels...');
        const { data, error } = await supabase
          .from('pixels')
          .select('*');

        if (error) throw error;

        console.log('Fetched pixels count:', data?.length);

        const pixelMap: PixelMap = {};
        data?.forEach((pixel) => {
          pixelMap[getPixelKey(pixel.x, pixel.y)] = pixel;
        });
        
        console.log('PixelMap keys count:', Object.keys(pixelMap).length);
        setPixels(pixelMap);
      } catch (err) {
        console.error('Failed to fetch pixels:', err);
        setError('Failed to load canvas');
      } finally {
        setLoading(false);
      }
    };

    fetchPixels();
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('pixels-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pixels',
        },
        (payload: RealtimePostgresChangesPayload<Pixel>) => {
          console.log('Pixel update:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const pixel = payload.new as Pixel;
            setPixels((prev) => ({
              ...prev,
              [getPixelKey(pixel.x, pixel.y)]: pixel,
            }));
          } else if (payload.eventType === 'DELETE') {
            const pixel = payload.old as Pixel;
            setPixels((prev) => {
              const newPixels = { ...prev };
              delete newPixels[getPixelKey(pixel.x, pixel.y)];
              return newPixels;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getPixel = useCallback((x: number, y: number): Pixel | undefined => {
    return pixels[getPixelKey(x, y)];
  }, [pixels]);

  const getPixelColor = useCallback((x: number, y: number): string | undefined => {
    return pixels[getPixelKey(x, y)]?.color;
  }, [pixels]);

  return {
    pixels,
    loading,
    error,
    getPixel,
    getPixelColor,
    pixelCount: Object.keys(pixels).length,
  };
}
