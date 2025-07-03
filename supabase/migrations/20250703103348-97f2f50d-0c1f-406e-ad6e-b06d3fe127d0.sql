
-- First, let's ensure we have a unique constraint on the profiles.email column
ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);

-- Create a function to check if email exists in auth.users table via a secure function
CREATE OR REPLACE FUNCTION public.check_email_exists(email_to_check text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if email exists in auth.users (accessible via security definer)
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = email_to_check
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_email_exists(text) TO authenticated;

-- Also ensure profiles table has proper RLS for the email check
CREATE POLICY "Allow email existence check" ON public.profiles
  FOR SELECT USING (true);
