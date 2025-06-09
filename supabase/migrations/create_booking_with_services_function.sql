
CREATE OR REPLACE FUNCTION public.create_confirmed_booking_with_services(
  p_user_id uuid, 
  p_merchant_id uuid, 
  p_service_id uuid, 
  p_staff_id uuid, 
  p_date date, 
  p_time_slot time without time zone, 
  p_service_duration integer,
  p_services text,
  p_total_duration integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_booking_id uuid;
  customer_info record;
  staff_info record;
  service_end_time time;
  overlapping_count integer;
BEGIN
  -- Calculate service end time
  service_end_time := p_time_slot + (p_service_duration || ' minutes')::interval;
  
  -- Check for overlapping confirmed bookings using range overlap
  SELECT COUNT(*) INTO overlapping_count
  FROM public.bookings b
  JOIN public.services s ON b.service_id = s.id
  WHERE b.staff_id = p_staff_id
  AND b.date = p_date
  AND b.status = 'confirmed'
  AND NOT (
    -- No overlap: new booking ends before existing starts OR new booking starts after existing ends
    service_end_time <= b.time_slot::time OR 
    p_time_slot >= (b.time_slot::time + (s.duration || ' minutes')::interval)
  );
  
  IF overlapping_count > 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Time slot overlaps with existing booking'
    );
  END IF;
  
  -- Get customer info
  SELECT name, email, phone INTO customer_info
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- If no profile exists, create one from auth.users
  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, name, email, phone, role)
    SELECT 
      p_user_id,
      COALESCE(raw_user_meta_data->>'name', 'Customer'),
      email,
      COALESCE(raw_user_meta_data->>'phone', ''),
      'customer'
    FROM auth.users 
    WHERE id = p_user_id
    ON CONFLICT (id) DO UPDATE SET
      name = COALESCE(EXCLUDED.name, profiles.name),
      email = COALESCE(EXCLUDED.email, profiles.email),
      phone = COALESCE(EXCLUDED.phone, profiles.phone);
    
    -- Get the customer info again
    SELECT name, email, phone INTO customer_info
    FROM public.profiles
    WHERE id = p_user_id;
  END IF;
  
  -- Get staff info
  SELECT name INTO staff_info
  FROM public.staff
  WHERE id = p_staff_id;
  
  -- Create the booking with confirmed status and include services and total_duration
  INSERT INTO public.bookings (
    user_id,
    merchant_id,
    service_id,
    staff_id,
    date,
    time_slot,
    status,
    payment_status,
    customer_name,
    customer_email,
    customer_phone,
    stylist_name,
    services,
    total_duration
  ) VALUES (
    p_user_id,
    p_merchant_id,
    p_service_id,
    p_staff_id,
    p_date,
    p_time_slot::text,
    'confirmed',
    'pending',
    customer_info.name,
    customer_info.email,
    customer_info.phone,
    staff_info.name,
    p_services::jsonb,
    p_total_duration
  ) RETURNING id INTO new_booking_id;
  
  RETURN json_build_object(
    'success', true,
    'booking_id', new_booking_id,
    'message', 'Booking created successfully'
  );
END;
$$;
