
-- Drop existing problematic RLS policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

-- Create comprehensive RLS policies for profiles table
CREATE POLICY "Enable read access for users to their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Enable insert for users to create their own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users to update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone, role, notification_enabled)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'User'),
    COALESCE(new.email, ''),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'customer'),
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, profiles.name),
    email = COALESCE(EXCLUDED.email, profiles.email),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    role = COALESCE(EXCLUDED.role, profiles.role);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to ensure profile exists for existing users
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS json AS $$
DECLARE
  user_record record;
BEGIN
  -- Get current user from auth
  SELECT * INTO user_record FROM auth.users WHERE id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Insert or update profile
  INSERT INTO public.profiles (id, name, email, phone, role, notification_enabled)
  VALUES (
    user_record.id,
    COALESCE(user_record.raw_user_meta_data->>'name', 'User'),
    COALESCE(user_record.email, ''),
    COALESCE(user_record.raw_user_meta_data->>'phone', ''),
    COALESCE(user_record.raw_user_meta_data->>'role', 'customer'),
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, profiles.name),
    email = COALESCE(EXCLUDED.email, profiles.email),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    role = COALESCE(EXCLUDED.role, profiles.role),
    notification_enabled = COALESCE(profiles.notification_enabled, true);
  
  RETURN json_build_object('success', true, 'message', 'Profile ensured');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
