
-- Create table for storing image generation history
CREATE TABLE public.image_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  steps INTEGER DEFAULT 20,
  cfg_scale DECIMAL DEFAULT 7.0,
  width INTEGER DEFAULT 512,
  height INTEGER DEFAULT 512,
  model_name TEXT DEFAULT 'default',
  image_url TEXT,
  comfyui_job_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add Row Level Security (RLS)
ALTER TABLE public.image_generations ENABLE ROW LEVEL SECURITY;

-- Create policies for image generations
CREATE POLICY "Users can view their own image generations" 
  ON public.image_generations 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own image generations" 
  ON public.image_generations 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own image generations" 
  ON public.image_generations 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_image_generations_user_id ON public.image_generations(user_id);
CREATE INDEX idx_image_generations_status ON public.image_generations(status);
CREATE INDEX idx_image_generations_created_at ON public.image_generations(created_at DESC);
