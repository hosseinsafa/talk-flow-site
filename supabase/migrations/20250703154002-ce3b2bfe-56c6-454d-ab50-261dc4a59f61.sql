
-- Add message type column to existing chat_messages table to differentiate chat vs image messages
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'chat';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_type_session ON public.chat_messages(message_type, session_id);

-- Create the image_library table for global image storage
CREATE TABLE IF NOT EXISTS public.image_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_id UUID,
    prompt TEXT,
    image_url TEXT,
    model_used TEXT,
    aspect_ratio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Enable RLS on image_library table
ALTER TABLE public.image_library ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for image_library
CREATE POLICY "Users can view their own images" 
    ON public.image_library 
    FOR SELECT 
    USING (user_id = auth.uid());

CREATE POLICY "Users can create their own images" 
    ON public.image_library 
    FOR INSERT 
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own images" 
    ON public.image_library 
    FOR UPDATE 
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own images" 
    ON public.image_library 
    FOR DELETE 
    USING (user_id = auth.uid());

-- Add index for better query performance on image_library
CREATE INDEX IF NOT EXISTS idx_image_library_user_created ON public.image_library(user_id, created_at DESC);
