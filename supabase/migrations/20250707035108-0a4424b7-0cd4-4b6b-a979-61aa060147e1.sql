
-- Function to check if email exists in auth.users
CREATE OR REPLACE FUNCTION public.check_user_email_exists(email_to_check text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if email exists in auth.users
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = lower(trim(email_to_check))
    AND email_confirmed_at IS NOT NULL
  );
END;
$$;

-- Function to get user info for password reset
CREATE OR REPLACE FUNCTION public.get_user_reset_info(user_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record record;
BEGIN
  -- Get user info from auth.users
  SELECT id, email, email_confirmed_at 
  INTO user_record
  FROM auth.users 
  WHERE email = lower(trim(user_email))
  AND email_confirmed_at IS NOT NULL;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Account not found'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'user', json_build_object(
      'id', user_record.id,
      'email', user_record.email,
      'confirmed', user_record.email_confirmed_at IS NOT NULL
    )
  );
END;
$$;
