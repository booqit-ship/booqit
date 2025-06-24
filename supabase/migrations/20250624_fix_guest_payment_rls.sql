
-- Update the guest booking function to handle payment creation
CREATE OR REPLACE FUNCTION public.create_guest_booking_safe(
  p_guest_name text, 
  p_guest_phone text, 
  p_guest_email text, 
  p_merchant_id uuid, 
  p_service_ids uuid[], 
  p_staff_id uuid, 
  p_date date, 
  p_time_slot text, 
  p_total_duration integer,
  p_payment_amount numeric DEFAULT NULL,
  p_payment_method text DEFAULT 'pay_on_shop'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  guest_user_id UUID;
  new_booking_id UUID;
  new_payment_id UUID;
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
  
  -- Use the same slot availability check as authenticated users
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
  
  -- Use provided payment amount or calculated total
  IF p_payment_amount IS NULL THEN
    p_payment_amount := total_price;
  END IF;
  
  -- Create the booking
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
  
  -- Create payment record using SECURITY DEFINER privileges to bypass RLS
  INSERT INTO public.payments (
    booking_id,
    method,
    amount,
    status
  ) VALUES (
    new_booking_id,
    p_payment_method,
    p_payment_amount,
    'completed'
  ) RETURNING id INTO new_payment_id;
  
  RETURN json_build_object(
    'success', true,
    'booking_id', new_booking_id,
    'payment_id', new_payment_id,
    'guest_user_id', guest_user_id,
    'total_price', total_price,
    'message', 'Guest booking and payment created successfully'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false, 
    'error', 'Failed to create booking: ' || SQLERRM
  );
END;
$$;
