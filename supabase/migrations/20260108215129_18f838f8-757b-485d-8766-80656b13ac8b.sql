-- Add image_url column to track which pixels have an image
ALTER TABLE public.pixels ADD COLUMN image_url text;

-- Add index for potential future queries
CREATE INDEX idx_pixels_image_url ON public.pixels (image_url) WHERE image_url IS NOT NULL;

COMMENT ON COLUMN public.pixels.image_url IS 'URL of the image that was used to color this pixel during bulk purchase';