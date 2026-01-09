-- Create storage bucket for canvas images
INSERT INTO storage.buckets (id, name, public)
VALUES ('canvas-images', 'canvas-images', true);

-- Allow anyone to view images in the bucket
CREATE POLICY "Anyone can view canvas images"
ON storage.objects FOR SELECT
USING (bucket_id = 'canvas-images');

-- Allow anyone to upload images (we verify payment in edge function)
CREATE POLICY "Anyone can upload canvas images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'canvas-images');

-- Create image_placements table for block-based ownership
CREATE TABLE public.image_placements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT,
  owner_wallet TEXT NOT NULL,
  price_lamports BIGINT NOT NULL DEFAULT 1000,
  transaction_signature TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure valid bounds
  CONSTRAINT valid_bounds CHECK (x >= 0 AND y >= 0 AND width > 0 AND height > 0 AND x + width <= 1000 AND y + height <= 1000)
);

-- Enable RLS
ALTER TABLE public.image_placements ENABLE ROW LEVEL SECURITY;

-- Anyone can view placements
CREATE POLICY "Anyone can view image placements"
ON public.image_placements FOR SELECT
USING (true);

-- Service role manages placements (edge function)
CREATE POLICY "Service role manages image placements"
ON public.image_placements FOR ALL
USING (true)
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_image_placements_updated_at
BEFORE UPDATE ON public.image_placements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for spatial queries
CREATE INDEX idx_image_placements_bounds ON public.image_placements (x, y, width, height);