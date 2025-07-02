
-- Create table for pending image requests
CREATE TABLE public.pending_image_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID NOT NULL,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.pending_image_requests ENABLE ROW LEVEL SECURITY;

-- Create policy that allows users to SELECT their own pending requests
CREATE POLICY "Users can view their own pending requests" 
  ON public.pending_image_requests 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy that allows users to INSERT their own pending requests
CREATE POLICY "Users can create their own pending requests" 
  ON public.pending_image_requests 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create policy that allows users to UPDATE their own pending requests
CREATE POLICY "Users can update their own pending requests" 
  ON public.pending_image_requests 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create policy that allows users to DELETE their own pending requests
CREATE POLICY "Users can delete their own pending requests" 
  ON public.pending_image_requests 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add foreign key constraints
ALTER TABLE public.pending_image_requests 
ADD CONSTRAINT pending_image_requests_session_id_fkey 
FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE;
