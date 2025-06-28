
-- Add firebase_uid column to profiles table for Firebase integration
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS firebase_uid TEXT;

-- Create index for faster lookups by Firebase UID
CREATE INDEX IF NOT EXISTS idx_profiles_firebase_uid ON public.profiles(firebase_uid);

-- Update RLS policies to allow Firebase UID operations
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id OR firebase_uid IS NOT NULL);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id OR firebase_uid IS NOT NULL);

CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id OR firebase_uid IS NOT NULL);

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
      'role', role,
      'firebase_uid', firebase_uid
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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.check_phone_exists(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_phone_exists(TEXT) TO anon;
