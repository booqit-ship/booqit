
-- Function to get guest bookings for cancellation (confirmed status only)
CREATE OR REPLACE FUNCTION get_guest_bookings_for_cancellation(
  p_booking_id UUID DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL
)
RETURNS TABLE(
  booking_id UUID,
  booking_date DATE,
  booking_time TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  shop_name TEXT,
  shop_address TEXT,
  service_name TEXT,
  service_duration INTEGER,
  service_price NUMERIC,
  stylist_name TEXT,
  booking_status TEXT,
  total_duration INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    b.id as booking_id,
    b.date as booking_date,
    b.time_slot as booking_time,
    b.customer_name,
    b.customer_phone,
    b.customer_email,
    m.shop_name,
    m.address as shop_address,
    s.name as service_name,
    s.duration as service_duration,
    s.price as service_price,
    b.stylist_name,
    b.status as booking_status,
    b.total_duration
  FROM public.bookings b
  JOIN public.merchants m ON b.merchant_id = m.id
  JOIN public.services s ON b.service_id = s.id
  WHERE b.guest_user_id IS NOT NULL  -- Only guest bookings
    AND b.status = 'confirmed'       -- Only confirmed bookings for cancellation
    AND (
      (p_booking_id IS NOT NULL AND b.id = p_booking_id) OR
      (p_phone_number IS NOT NULL AND b.customer_phone = p_phone_number)
    )
  ORDER BY b.date DESC, b.time_slot DESC;
END;
$function$;

-- Function to get complete guest booking history (all statuses)
CREATE OR REPLACE FUNCTION get_guest_booking_history(
  p_phone_number TEXT
)
RETURNS TABLE(
  booking_id UUID,
  booking_date DATE,
  booking_time TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  shop_name TEXT,
  shop_address TEXT,
  service_name TEXT,
  service_duration INTEGER,
  service_price NUMERIC,
  stylist_name TEXT,
  booking_status TEXT,
  total_duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  merchant_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    b.id as booking_id,
    b.date as booking_date,
    b.time_slot as booking_time,
    b.customer_name,
    b.customer_phone,
    b.customer_email,
    m.shop_name,
    m.address as shop_address,
    s.name as service_name,
    s.duration as service_duration,
    s.price as service_price,
    b.stylist_name,
    b.status as booking_status,
    b.total_duration,
    b.created_at,
    b.merchant_id
  FROM public.bookings b
  JOIN public.merchants m ON b.merchant_id = m.id
  JOIN public.services s ON b.service_id = s.id
  WHERE b.guest_user_id IS NOT NULL  -- Only guest bookings
    AND b.customer_phone = p_phone_number
  ORDER BY b.created_at DESC;
END;
$function$;

-- Function to cancel guest booking safely
CREATE OR REPLACE FUNCTION cancel_guest_booking_safe(
  p_booking_id UUID
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  booking_record RECORD;
BEGIN
  -- Get the booking details with validation
  SELECT * INTO booking_record
  FROM public.bookings
  WHERE id = p_booking_id
    AND guest_user_id IS NOT NULL  -- Only guest bookings
    AND status = 'confirmed';      -- Only confirmed bookings can be cancelled
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking not found or cannot be cancelled'
    );
  END IF;
  
  -- Update booking status to cancelled
  UPDATE public.bookings
  SET status = 'cancelled',
      updated_at = now()
  WHERE id = p_booking_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Booking cancelled successfully',
    'booking_id', p_booking_id
  );
END;
$function$;

-- Function to get detailed booking info for receipt generation
CREATE OR REPLACE FUNCTION get_guest_booking_receipt_data(
  p_booking_id UUID
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  booking_data JSON;
  services_data JSON[];
  service_record RECORD;
BEGIN
  -- Get main booking data
  SELECT json_build_object(
    'bookingId', b.id::text,
    'merchant', json_build_object(
      'shop_name', m.shop_name,
      'address', m.address
    ),
    'totalPrice', s.price,
    'bookingDate', b.date::text,
    'bookingTime', b.time_slot,
    'guestInfo', json_build_object(
      'name', b.customer_name,
      'phone', b.customer_phone,
      'email', b.customer_email
    ),
    'selectedStaffDetails', CASE 
      WHEN b.stylist_name IS NOT NULL THEN json_build_object('name', b.stylist_name)
      ELSE NULL
    END
  ) INTO booking_data
  FROM public.bookings b
  JOIN public.merchants m ON b.merchant_id = m.id
  JOIN public.services s ON b.service_id = s.id
  WHERE b.id = p_booking_id
    AND b.guest_user_id IS NOT NULL;
  
  -- Get services data (including additional services from booking_services table)
  services_data := ARRAY[]::JSON[];
  
  FOR service_record IN 
    SELECT DISTINCT s.id, s.name, s.duration, s.price
    FROM public.services s
    WHERE s.id IN (
      SELECT service_id FROM public.booking_services WHERE booking_id = p_booking_id
      UNION
      SELECT service_id FROM public.bookings WHERE id = p_booking_id
    )
  LOOP
    services_data := services_data || json_build_object(
      'id', service_record.id::text,
      'name', service_record.name,
      'duration', service_record.duration,
      'price', service_record.price
    );
  END LOOP;
  
  IF booking_data IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Booking not found');
  END IF;
  
  -- Combine booking data with services
  RETURN json_build_object(
    'success', true,
    'data', booking_data || json_build_object('selectedServices', services_data)
  );
END;
$function$;
