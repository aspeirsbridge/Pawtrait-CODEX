-- Store original pre-filter image for gallery compare view
ALTER TABLE public.pawtraits
ADD COLUMN IF NOT EXISTS original_image_url TEXT;
