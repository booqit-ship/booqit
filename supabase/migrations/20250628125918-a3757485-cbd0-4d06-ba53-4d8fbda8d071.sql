
-- Remove Firebase-related columns and constraints
ALTER TABLE public.profiles DROP COLUMN IF EXISTS firebase_uid;
DROP INDEX IF EXISTS idx_profiles_firebase_uid;

-- Remove phone-related constraints and make email required again
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_email_or_phone;
ALTER TABLE public.profiles ALTER COLUMN email SET NOT NULL;
DROP INDEX IF EXISTS idx_profiles_phone;

-- Remove the avatar_url column if it was added for phone auth
-- (keeping it if it was part of the original design)
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS avatar_url;

-- Clean up any Firebase-related functions
DROP FUNCTION IF EXISTS public.merge_duplicate_profiles();

-- Update the profile creation function to be email-only
CREATE OR REPLACE FUNCTION public.ensure_user_profile_on_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert profile for new user (email-only)
  INSERT INTO public.profiles (id, name, email, role, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'Customer'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, profiles.name),
    email = COALESCE(EXCLUDED.email, profiles.email),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Update the get_or_create function to be email-only
CREATE OR REPLACE FUNCTION public.get_or_create_user_profile(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Try to get existing profile
  SELECT * INTO user_record FROM public.profiles WHERE profiles.id = p_user_id LIMIT 1;
  
  -- If profile doesn't exist, create it
  IF NOT FOUND THEN
    -- Get user data from auth.users
    SELECT 
      au.id,
      COALESCE(au.raw_user_meta_data->>'name', au.email, 'Customer') as name,
      au.email,
      COALESCE(au.raw_user_meta_data->>'phone', '') as phone,
      COALESCE(au.raw_user_meta_data->>'role', 'customer') as role
    INTO user_record
    FROM auth.users au
    WHERE au.id = p_user_id;
    
    -- Insert the new profile (email required)
    INSERT INTO public.profiles (id, name, email, phone, role, created_at, updated_at)
    VALUES (
      p_user_id,
      user_record.name,
      user_record.email,
      COALESCE(user_record.phone, ''),
      user_record.role,
      NOW(),
      NOW()
    );
    
    -- Get the newly created profile
    SELECT * INTO user_record FROM public.profiles WHERE profiles.id = p_user_id;
  END IF;
  
  -- Return the profile data
  RETURN QUERY
  SELECT 
    user_record.id,
    user_record.name,
    user_record.email,
    user_record.phone,
    user_record.role,
    user_record.avatar_url,
    user_record.created_at,
    user_record.updated_at;
END;
$$;

-- Clean up any Firebase-related data
UPDATE public.profiles SET phone = '' WHERE phone IS NULL;
