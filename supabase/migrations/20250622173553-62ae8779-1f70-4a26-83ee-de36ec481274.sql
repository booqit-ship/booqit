
-- Create a separate table for guest users (completely independent from auth users)
CREATE TABLE IF NOT EXISTS public.guest_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for guest_users
ALTER TABLE public.guest_users ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert and read guest user records (for guest bookings only)
CREATE POLICY "Allow guest user operations" 
  ON public.guest_users 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Add guest_user_id column to bookings table (nullable, won't affect existing bookings)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' 
    AND column_name = 'guest_user_id'
  ) THEN
    ALTER TABLE public.bookings 
    ADD COLUMN guest_user_id UUID REFERENCES public.guest_users(id);
  END IF;
END $$;

-- Create booking_services table for multiple services per booking (if not exists)
CREATE TABLE IF NOT EXISTS public.booking_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(booking_id, service_id)
);

-- Enable RLS for booking_services
ALTER TABLE public.booking_services ENABLE ROW LEVEL SECURITY;

-- Allow operations on booking_services (this won't affect main booking flow)
CREATE POLICY "Allow booking services operations" 
  ON public.booking_services 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Create a function specifically for guest bookings (won't interfere with authenticated flow)
-- Fixed parameter defaults issue
CREATE OR REPLACE FUNCTION public.create_guest_booking(
  p_guest_name TEXT,
  p_guest_phone TEXT,
  p_merchant_id UUID,
  p_service_ids UUID[],
  p_staff_id UUID,
  p_date DATE,
  p_time_slot TEXT,
  p_guest_email TEXT DEFAULT NULL,
  p_total_duration INTEGER DEFAULT 30
) RETURNS JSON
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
  
  -- Check for time conflicts (same validation as authenticated bookings)
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
  
  -- Create the booking (note: user_id stays NULL, guest_user_id is used instead)
  INSERT INTO public.bookings (
    user_id, -- This stays NULL for guest bookings
    guest_user_id, -- New field for guest bookings
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
    NULL, -- No authenticated user
    guest_user_id, -- Guest user reference
    p_merchant_id,
    p_service_ids[1], -- First service as primary
    p_staff_id,
    p_date,
    p_time_slot,
    'confirmed', -- Guest bookings are auto-confirmed
    'completed', -- Guest bookings are treated as paid
    p_guest_name,
    p_guest_phone,
    p_guest_email,
    staff_name,
    p_total_duration
  ) RETURNING id INTO new_booking_id;
  
  -- Add all services to booking_services table
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

-- Function to get merchant booking link info
CREATE OR REPLACE FUNCTION public.get_merchant_booking_info(p_merchant_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  merchant_record RECORD;
BEGIN
  SELECT shop_name, category, address, image_url
  INTO merchant_record
  FROM public.merchants
  WHERE id = p_merchant_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Merchant not found');
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'merchant', json_build_object(
      'id', p_merchant_id,
      'shop_name', merchant_record.shop_name,
      'category', merchant_record.category,
      'address', merchant_record.address,
      'image_url', merchant_record.image_url
    )
  );
END;
$$;
