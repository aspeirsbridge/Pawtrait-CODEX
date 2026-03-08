-- Create pawtraits table for storing pet portrait metadata
CREATE TABLE public.pawtraits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  filter_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.pawtraits ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own pawtraits" 
ON public.pawtraits 
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create pawtraits" 
ON public.pawtraits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own pawtraits" 
ON public.pawtraits 
FOR UPDATE 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own pawtraits" 
ON public.pawtraits 
FOR DELETE 
USING (auth.uid() = user_id OR user_id IS NULL);

-- Create storage bucket for pawtrait images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pawtraits', 'pawtraits', true);

-- Create storage policies
CREATE POLICY "Anyone can view pawtrait images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'pawtraits');

CREATE POLICY "Users can upload pawtrait images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'pawtraits');

CREATE POLICY "Users can update their pawtrait images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'pawtraits');

CREATE POLICY "Users can delete their pawtrait images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'pawtraits');