-- Create pixels table for the 1000x1000 canvas
CREATE TABLE public.pixels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  x INTEGER NOT NULL CHECK (x >= 0 AND x < 1000),
  y INTEGER NOT NULL CHECK (y >= 0 AND y < 1000),
  color TEXT NOT NULL DEFAULT '#FFFFFF',
  owner_wallet TEXT,
  price_lamports BIGINT NOT NULL DEFAULT 1000000, -- 0.001 SOL = 1,000,000 lamports
  transaction_signature TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(x, y)
);

-- Create index for efficient lookups
CREATE INDEX idx_pixels_coords ON public.pixels (x, y);
CREATE INDEX idx_pixels_owner ON public.pixels (owner_wallet);

-- Enable Row Level Security
ALTER TABLE public.pixels ENABLE ROW LEVEL SECURITY;

-- Everyone can read pixels (it's a public canvas)
CREATE POLICY "Anyone can view pixels" 
ON public.pixels 
FOR SELECT 
USING (true);

-- Inserts/updates will be done via edge function with service role
-- We allow all inserts/updates but the edge function validates payments
CREATE POLICY "Service role can manage pixels" 
ON public.pixels 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_pixels_updated_at
BEFORE UPDATE ON public.pixels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for pixels table
ALTER PUBLICATION supabase_realtime ADD TABLE public.pixels;