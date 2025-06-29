
-- Create users table for phone authentication (separate from Supabase Auth)
CREATE TABLE public.phone_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- Create OTP codes table
CREATE TABLE public.phone_otp_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '10 minutes'),
  verified BOOLEAN NOT NULL DEFAULT false,
  attempts INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.phone_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_otp_codes ENABLE ROW LEVEL SECURITY;

-- Create policies (allow service role access)
CREATE POLICY "Service role can manage phone users" 
  ON public.phone_users 
  FOR ALL 
  USING (true);

CREATE POLICY "Service role can manage phone OTP codes" 
  ON public.phone_otp_codes 
  FOR ALL 
  USING (true);

-- Create indexes for better performance
CREATE INDEX idx_phone_users_phone ON public.phone_users(phone_number);
CREATE INDEX idx_phone_otp_codes_phone ON public.phone_otp_codes(phone_number);
CREATE INDEX idx_phone_otp_codes_expires ON public.phone_otp_codes(expires_at);
