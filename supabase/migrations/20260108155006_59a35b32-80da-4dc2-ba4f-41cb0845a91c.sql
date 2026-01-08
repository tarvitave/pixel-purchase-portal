-- Add batch_id column to group pixels from the same bulk purchase
ALTER TABLE public.pixels 
ADD COLUMN batch_id UUID DEFAULT NULL;

-- Create index for efficient batch lookups
CREATE INDEX idx_pixels_batch_id ON public.pixels(batch_id) WHERE batch_id IS NOT NULL;

-- Update existing bulk purchases: pixels with same owner, link_url, and similar timestamps 
-- are likely from the same batch. We'll set batch_id for pixels that share the same 
-- transaction_signature reference (same created_at time window and same owner)
-- For new purchases, the application will handle setting batch_id