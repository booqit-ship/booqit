
-- Only add guest-specific tables and functions without affecting existing user flow

-- Create guest_users table if it doesn't exist (safe - new table)
CREATE TABLE IF NOT EXISTS public.guest_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Only add guest_user_id column if it doesn't exist (safe - optional column)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'guest_user_id') THEN
    ALTER TABLE public.bookings ADD COLUMN guest_user_id UUID REFERENCES public.guest_users(id);
  END IF;
END $$;

-- Create booking_services table if it doesn't exist (safe - new table for multiple services)
CREATE TABLE IF NOT EXISTS public.booking_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables only
ALTER TABLE public.guest_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_services ENABLE ROW LEVEL SECURITY;

-- Create simple RLS policies for new tables only
CREATE POLICY "Allow guest user creation" ON public.guest_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow guest user viewing" ON public.guest_users FOR SELECT USING (true);
CREATE POLICY "Allow booking services creation" ON public.booking_services FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow booking services viewing" ON public.booking_services FOR SELECT USING (true);

-- Create a separate guest booking function that doesn't interfere with existing functions
CREATE OR REPLACE FUNCTION public.create_guest_booking_safe(
  p_guest_name text, 
  p_guest_phone text, 
  p_guest_email text,
  p_merchant_id uuid, 
  p_service_ids uuid[], 
  p_staff_id uuid, 
  p_date date, 
  p_time_slot text, 
  p_total_duration integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  guest_user_id UUID;
  new_booking_id UUID;
  service_record RECORD;
  total_price NUMERIC := 0;
  staff_name TEXT;
  service_end_time TIME;
  overlapping_count INTEGER;
BEGIN
  -- Validate inputs
  IF p_guest_name IS NULL OR trim(p_guest_name) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Name is required');
  END IF;
  
  IF p_guest_phone IS NULL OR trim(p_guest_phone) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Phone number is required');
  END IF;
  
  -- Use the same slot availability check as authenticated users (reuse existing logic)
  service_end_time := p_time_slot::time + (p_total_duration || ' minutes')::interval;
  
  SELECT COUNT(*) INTO overlapping_count
  FROM public.bookings b
  WHERE b.staff_id = p_staff_id
  AND b.date = p_date
  AND b.status IN ('confirmed', 'pending', 'completed')
  AND NOT (
    service_end_time <= b.time_slot::time OR 
    p_time_slot::time >= (b.time_slot::time + (COALESCE(b.total_duration, 30) || ' minutes')::interval)
  );
  
  IF overlapping_count > 0 THEN
    RETURN json_build_object('success', false, 'error', 'Time slot is no longer available');
  END IF;
  
  -- Create guest user record
  INSERT INTO public.guest_users (name, phone, email)
  VALUES (p_guest_name, p_guest_phone, p_guest_email)
  RETURNING id INTO guest_user_id;
  
  -- Get staff name
  SELECT name INTO staff_name FROM public.staff WHERE id = p_staff_id;
  
  -- Calculate total price from services
  FOR service_record IN 
    SELECT * FROM public.services WHERE id = ANY(p_service_ids)
  LOOP
    total_price := total_price + service_record.price;
  END LOOP;
  
  -- Create the booking using the same structure as authenticated users
  INSERT INTO public.bookings (
    user_id,
    guest_user_id,
    merchant_id,
    service_id,
    staff_id,
    date,
    time_slot,
    status,
    payment_status,
    customer_name,
    customer_phone,
    customer_email,
    stylist_name,
    total_duration
  ) VALUES (
    NULL, -- No authenticated user for guest bookings
    guest_user_id,
    p_merchant_id,
    p_service_ids[1], -- Primary service
    p_staff_id,
    p_date,
    p_time_slot,
    'confirmed', -- Guest bookings are auto-confirmed
    'completed', -- Payment at salon, mark as completed
    p_guest_name,
    p_guest_phone,
    p_guest_email,
    staff_name,
    p_total_duration
  ) RETURNING id INTO new_booking_id;
  
  -- Add all services to booking_services table for multiple service support
  INSERT INTO public.booking_services (booking_id, service_id)
  SELECT new_booking_id, unnest(p_service_ids);
  
  RETURN json_build_object(
    'success', true,
    'booking_id', new_booking_id,
    'guest_user_id', guest_user_id,
    'total_price', total_price,
    'message', 'Guest booking created successfully'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false, 
    'error', 'Failed to create booking: ' || SQLERRM
  );
END;
$$;
