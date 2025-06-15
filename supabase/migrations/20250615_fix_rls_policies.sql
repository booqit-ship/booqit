
-- Fix RLS policies for profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

-- Create more permissive RLS policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- Fix RLS policies for payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;

-- Create RLS policies for payments table
CREATE POLICY "Users can view own payments" ON public.payments
FOR SELECT USING (
  booking_id IN (
    SELECT id FROM public.bookings WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert payments for own bookings" ON public.payments
FOR INSERT WITH CHECK (
  booking_id IN (
    SELECT id FROM public.bookings WHERE user_id = auth.uid()
  )
);

-- Allow merchants to view payments for their bookings
CREATE POLICY "Merchants can view payments for their bookings" ON public.payments
FOR SELECT USING (
  booking_id IN (
    SELECT b.id FROM public.bookings b
    JOIN public.merchants m ON b.merchant_id = m.id
    WHERE m.user_id = auth.uid()
  )
);

-- Function to create merchant profile if not exists
CREATE OR REPLACE FUNCTION public.ensure_merchant_profile(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_data record;
BEGIN
  -- Get user data from auth.users
  SELECT 
    email,
    raw_user_meta_data->>'name' as name,
    raw_user_meta_data->>'phone' as phone,
    raw_user_meta_data->>'role' as role
  INTO user_data
  FROM auth.users 
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found in auth table');
  END IF;
  
  -- Insert profile if not exists
  INSERT INTO public.profiles (
    id, 
    name, 
    email, 
    phone, 
    role,
    notification_enabled
  ) VALUES (
    p_user_id,
    COALESCE(user_data.name, 'User'),
    COALESCE(user_data.email, ''),
    COALESCE(user_data.phone, ''),
    COALESCE(user_data.role, 'merchant'),
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, profiles.name),
    email = COALESCE(EXCLUDED.email, profiles.email),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    notification_enabled = COALESCE(profiles.notification_enabled, true);
  
  RETURN json_build_object('success', true, 'message', 'Profile ensured');
END;
$$;
