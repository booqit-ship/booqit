
-- Create a function to ensure user profiles are created automatically
CREATE OR REPLACE FUNCTION public.ensure_user_profile_on_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert profile for new user
  INSERT INTO public.profiles (id, name, email, phone, role, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'Customer'),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, profiles.name),
    email = COALESCE(EXCLUDED.email, profiles.email),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create profiles on user creation
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.ensure_user_profile_on_auth();

-- Create a function to get or create user profile
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
      COALESCE(au.email, '') as email,
      COALESCE(au.raw_user_meta_data->>'phone', '') as phone,
      COALESCE(au.raw_user_meta_data->>'role', 'customer') as role
    INTO user_record
    FROM auth.users au
    WHERE au.id = p_user_id;
    
    -- Insert the new profile
    INSERT INTO public.profiles (id, name, email, phone, role, created_at, updated_at)
    VALUES (
      p_user_id,
      user_record.name,
      user_record.email,
      user_record.phone,
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
