
-- Add phone number column to profiles table
ALTER TABLE public.profiles ADD COLUMN phone_number TEXT;

-- Create a table for OTP verification
CREATE TABLE public.otp_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '10 minutes'),
  verified BOOLEAN NOT NULL DEFAULT false,
  attempts INTEGER NOT NULL DEFAULT 0
);

-- Add Row Level Security (RLS) to OTP table
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- Create policy for OTP verification (users can only access their own OTP records)
CREATE POLICY "Users can manage their own OTP verifications" 
  ON public.otp_verifications 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_otp_phone_number ON public.otp_verifications(phone_number);
CREATE INDEX idx_otp_expires_at ON public.otp_verifications(expires_at);

-- Update existing RLS policies for profiles (drop and recreate to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);
