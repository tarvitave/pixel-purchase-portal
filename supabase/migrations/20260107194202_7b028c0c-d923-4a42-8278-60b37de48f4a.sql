-- Add link_url column to pixels table
ALTER TABLE public.pixels 
ADD COLUMN link_url TEXT DEFAULT NULL;