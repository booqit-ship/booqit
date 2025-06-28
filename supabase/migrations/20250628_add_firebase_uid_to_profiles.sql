
-- Add firebase_uid column to profiles table for Firebase integration
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS firebase_uid TEXT;

-- Create index for faster lookups by Firebase UID
CREATE INDEX IF NOT EXISTS idx_profiles_firebase_uid ON public.profiles(firebase_uid);

-- Add function to check if phone exists
CREATE OR REPLACE FUNCTION public.check_phone_exists(p_phone TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_exists BOOLEAN := FALSE;
  user_data JSON;
BEGIN
  -- Check if phone number exists in profiles
  SELECT EXISTS(
    SELECT 1 FROM public.profiles WHERE phone = p_phone
  ) INTO profile_exists;
  
  IF profile_exists THEN
    SELECT json_build_object(
      'id', id,
      'name', name,
      'phone', phone,
      'email', email,
      'role', role
    ) INTO user_data
    FROM public.profiles 
    WHERE phone = p_phone
    LIMIT 1;
    
    RETURN json_build_object(
      'exists', true,
      'user', user_data
    );
  ELSE
    RETURN json_build_object(
      'exists', false,
      'user', null
    );
  END IF;
END;
$$;
