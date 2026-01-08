-- Backfill batch_id for legacy bulk purchases
-- Group pixels by: same owner_wallet, same link_url, and created_at within 1 second of each other

-- Create a temporary function to assign batch_ids to legacy purchases
DO $$
DECLARE
  pixel_record RECORD;
  current_batch_id UUID;
  last_owner TEXT := '';
  last_link TEXT := '';
  last_created TIMESTAMPTZ := '1970-01-01'::TIMESTAMPTZ;
BEGIN
  -- Process pixels that don't have a batch_id, ordered to group similar ones together
  FOR pixel_record IN 
    SELECT id, owner_wallet, link_url, created_at 
    FROM public.pixels 
    WHERE batch_id IS NULL 
      AND owner_wallet IS NOT NULL
    ORDER BY owner_wallet, link_url NULLS LAST, created_at
  LOOP
    -- Check if this pixel belongs to the same batch as the previous one
    -- Same batch if: same owner, same link_url (or both null), and created within 2 seconds
    IF pixel_record.owner_wallet = last_owner 
       AND (pixel_record.link_url = last_link OR (pixel_record.link_url IS NULL AND last_link IS NULL))
       AND ABS(EXTRACT(EPOCH FROM (pixel_record.created_at - last_created))) < 2
    THEN
      -- Continue with the same batch
      UPDATE public.pixels SET batch_id = current_batch_id WHERE id = pixel_record.id;
    ELSE
      -- Start a new batch
      current_batch_id := gen_random_uuid();
      UPDATE public.pixels SET batch_id = current_batch_id WHERE id = pixel_record.id;
    END IF;
    
    -- Update tracking variables
    last_owner := pixel_record.owner_wallet;
    last_link := pixel_record.link_url;
    last_created := pixel_record.created_at;
  END LOOP;
END $$;