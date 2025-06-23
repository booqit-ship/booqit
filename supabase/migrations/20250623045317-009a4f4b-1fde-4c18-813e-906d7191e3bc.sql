
-- Fix the database trigger to handle guest bookings properly
CREATE OR REPLACE FUNCTION public.ensure_profile_and_stylist_on_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Only try to ensure profile for authenticated users (not guest bookings)
  IF NEW.user_id IS NOT NULL THEN
    -- Ensure profile exists for authenticated users
    INSERT INTO public.profiles (id, name, email, phone, role)
    VALUES (
      NEW.user_id,
      COALESCE((SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = NEW.user_id), 'Customer'),
      COALESCE((SELECT email FROM auth.users WHERE id = NEW.user_id), ''),
      COALESCE((SELECT raw_user_meta_data->>'phone' FROM auth.users WHERE id = NEW.user_id), ''),
      'customer'
    )
    ON CONFLICT (id) DO UPDATE SET
      name = COALESCE(EXCLUDED.name, profiles.name),
      email = COALESCE(EXCLUDED.email, profiles.email),
      phone = COALESCE(EXCLUDED.phone, profiles.phone);
    
    -- Populate customer details from profile
    SELECT name, email, phone 
    INTO NEW.customer_name, NEW.customer_email, NEW.customer_phone
    FROM public.profiles 
    WHERE id = NEW.user_id;
    
    -- If no profile found, try to get from auth.users
    IF NEW.customer_name IS NULL THEN
      SELECT 
        COALESCE(raw_user_meta_data->>'name', 'Customer'),
        email,
        COALESCE(raw_user_meta_data->>'phone', '')
      INTO NEW.customer_name, NEW.customer_email, NEW.customer_phone
      FROM auth.users 
      WHERE id = NEW.user_id;
    END IF;
  END IF;
  
  -- For both guest and authenticated bookings, populate stylist name if staff_id is provided
  IF NEW.staff_id IS NOT NULL THEN
    SELECT name INTO NEW.stylist_name
    FROM public.staff
    WHERE id = NEW.staff_id;
  END IF;
  
  RETURN NEW;
END;
$function$
