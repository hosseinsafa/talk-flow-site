
-- Add model column to image_generations table to track which model was used
ALTER TABLE image_generations 
ADD COLUMN IF NOT EXISTS model_type text DEFAULT 'flux_schnell';

-- Update the existing records to have a default model
UPDATE image_generations 
SET model_type = 'flux_schnell' 
WHERE model_type IS NULL;

-- Add RLS policies for image_generations table if they don't exist
DO $$ 
BEGIN
    -- Check if RLS is already enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'image_generations' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE image_generations ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Create RLS policies for image_generations if they don't exist
DO $$ 
BEGIN
    -- Policy for users to view their own generations
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'image_generations' 
        AND policyname = 'Users can view their own image generations'
    ) THEN
        CREATE POLICY "Users can view their own image generations" 
        ON image_generations 
        FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;

    -- Policy for users to create their own generations
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'image_generations' 
        AND policyname = 'Users can create image generations'
    ) THEN
        CREATE POLICY "Users can create image generations" 
        ON image_generations 
        FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Policy for users to update their own generations
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'image_generations' 
        AND policyname = 'Users can update their own image generations'
    ) THEN
        CREATE POLICY "Users can update their own image generations" 
        ON image_generations 
        FOR UPDATE 
        USING (auth.uid() = user_id);
    END IF;
END $$;
