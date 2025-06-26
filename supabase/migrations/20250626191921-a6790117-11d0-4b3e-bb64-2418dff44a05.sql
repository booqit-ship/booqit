
-- Drop existing functions first to avoid conflicts
DROP FUNCTION IF EXISTS public.get_guest_bookings_for_cancellation(UUID, TEXT);
DROP FUNCTION IF EXISTS public.get_guest_booking_history(TEXT);
DROP FUNCTION IF EXISTS public.cancel_guest_booking_safe(UUID);
DROP FUNCTION IF EXISTS public.get_guest_booking_receipt_data(UUID);

-- Create missing functions for guest booking management with correct data types
CREATE OR REPLACE FUNCTION public.get_guest_bookings_for_cancellation(
  p_booking_id UUID DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL
) RETURNS TABLE(
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
  service_price DOUBLE PRECISION,
  stylist_name TEXT,
  booking_status TEXT,
  total_duration INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    COALESCE(b.total_duration, s.duration) as total_duration
  FROM public.bookings b
  JOIN public.merchants m ON b.merchant_id = m.id
  JOIN public.services s ON b.service_id = s.id
  WHERE b.status = 'confirmed'
    AND (
      (p_booking_id IS NOT NULL AND b.id = p_booking_id) OR
      (p_phone_number IS NOT NULL AND b.customer_phone = p_phone_number)
    )
  ORDER BY b.date DESC, b.time_slot DESC;
END;
$$;

-- Create function for guest booking history
CREATE OR REPLACE FUNCTION public.get_guest_booking_history(
  p_phone_number TEXT
) RETURNS TABLE(
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
  service_price DOUBLE PRECISION,
  stylist_name TEXT,
  booking_status TEXT,
  total_duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  merchant_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    COALESCE(b.total_duration, s.duration) as total_duration,
    b.created_at,
    b.merchant_id
  FROM public.bookings b
  JOIN public.merchants m ON b.merchant_id = m.id
  JOIN public.services s ON b.service_id = s.id
  WHERE b.customer_phone = p_phone_number
  ORDER BY b.created_at DESC;
END;
$$;

-- Create function for guest booking cancellation
CREATE OR REPLACE FUNCTION public.cancel_guest_booking_safe(
  p_booking_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  booking_record RECORD;
BEGIN
  -- Get booking details
  SELECT * INTO booking_record
  FROM public.bookings
  WHERE id = p_booking_id
    AND status = 'confirmed';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Booking not found or cannot be cancelled');
  END IF;
  
  -- Update booking status to cancelled
  UPDATE public.bookings
  SET status = 'cancelled',
      updated_at = now()
  WHERE id = p_booking_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Booking cancelled successfully'
  );
END;
$$;

-- Create function for guest booking receipt data
CREATE OR REPLACE FUNCTION public.get_guest_booking_receipt_data(
  p_booking_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  receipt_data JSON;
BEGIN
  SELECT json_build_object(
    'success', true,
    'data', json_build_object(
      'booking_id', b.id,
      'booking_date', b.date,
      'booking_time', b.time_slot,
      'customer_name', b.customer_name,
      'customer_phone', b.customer_phone,
      'customer_email', b.customer_email,
      'shop_name', m.shop_name,
      'shop_address', m.address,
      'service_name', s.name,
      'service_price', s.price,
      'service_duration', s.duration,
      'stylist_name', b.stylist_name,
      'booking_status', b.status,
      'payment_status', b.payment_status,
      'total_amount', s.price,
      'created_at', b.created_at
    )
  ) INTO receipt_data
  FROM public.bookings b
  JOIN public.merchants m ON b.merchant_id = m.id
  JOIN public.services s ON b.service_id = s.id
  WHERE b.id = p_booking_id;
  
  IF receipt_data IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Booking not found');
  END IF;
  
  RETURN receipt_data;
END;
$$;
