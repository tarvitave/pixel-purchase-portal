-- Drop the problematic index on image_url (base64 data is too large for btree index)
DROP INDEX IF EXISTS idx_pixels_image_url;