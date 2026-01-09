-- Update CHECK constraints for 500x500 canvas

-- For pixels table: drop and recreate with new bounds
ALTER TABLE public.pixels DROP CONSTRAINT IF EXISTS pixels_x_check;
ALTER TABLE public.pixels DROP CONSTRAINT IF EXISTS pixels_y_check;
ALTER TABLE public.pixels ADD CONSTRAINT pixels_x_check CHECK (x >= 0 AND x < 500);
ALTER TABLE public.pixels ADD CONSTRAINT pixels_y_check CHECK (y >= 0 AND y < 500);

-- For image_placements table: drop and recreate with new bounds
ALTER TABLE public.image_placements DROP CONSTRAINT IF EXISTS valid_bounds;
ALTER TABLE public.image_placements ADD CONSTRAINT valid_bounds CHECK (x >= 0 AND y >= 0 AND width > 0 AND height > 0 AND x + width <= 500 AND y + height <= 500);