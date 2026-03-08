-- First, remove the existing RLS policies that allow NULL user_id
DROP POLICY IF EXISTS "Users can view their own pawtraits" ON public.pawtraits;
DROP POLICY IF EXISTS "Users can create pawtraits" ON public.pawtraits;
DROP POLICY IF EXISTS "Users can update their own pawtraits" ON public.pawtraits;
DROP POLICY IF EXISTS "Users can delete their own pawtraits" ON public.pawtraits;

-- Delete any existing pawtraits with NULL user_id as these are anonymous
DELETE FROM public.pawtraits WHERE user_id IS NULL;

-- Make user_id NOT NULL since auth is now required
ALTER TABLE public.pawtraits 
  ALTER COLUMN user_id SET NOT NULL;

-- Create new secure RLS policies (without NULL checks)
CREATE POLICY "Users can view their own pawtraits" 
  ON public.pawtraits 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create pawtraits" 
  ON public.pawtraits 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pawtraits" 
  ON public.pawtraits 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pawtraits" 
  ON public.pawtraits 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Update storage policies to require authentication
DROP POLICY IF EXISTS "Anyone can view pawtrait images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload pawtrait images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their pawtrait images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their pawtrait images" ON storage.objects;

-- Create secure storage policies
CREATE POLICY "Users can view pawtrait images" 
  ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'pawtraits' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can upload their own pawtrait images" 
  ON storage.objects 
  FOR INSERT 
  WITH CHECK (bucket_id = 'pawtraits' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own pawtrait images" 
  ON storage.objects 
  FOR UPDATE 
  USING (bucket_id = 'pawtraits' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own pawtrait images" 
  ON storage.objects 
  FOR DELETE 
  USING (bucket_id = 'pawtraits' AND auth.uid() IS NOT NULL);