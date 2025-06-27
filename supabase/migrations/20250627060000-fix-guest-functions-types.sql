
-- Drop existing functions to recreate with correct types
DROP FUNCTION IF EXISTS public.get_guest_booking_history(TEXT);
DROP FUNCTION IF EXISTS public.get_guest_bookings_for_cancellation(UUID, TEXT);

-- Create get_guest_booking_history with correct return types
CREATE OR REPLACE FUNCTION public.get_guest_booking_history(
  p_phone_number TEXT
) RETURNS TABLE(
  booking_id TEXT,
  booking_date TEXT,
  booking_time TEXT,
  customer_name TEXT,  
  customer_phone TEXT,
  customer_email TEXT,
  shop_name TEXT,
  shop_address TEXT,
  service_name TEXT,
  service_duration INTEGER,
  service_price DOUBLE PRECISION,  -- Changed from NUMERIC to DOUBLE PRECISION
  stylist_name TEXT,
  booking_status TEXT,
  total_duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  merchant_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id::TEXT as booking_id,
    b.date::TEXT as booking_date,  -- Cast to TEXT to match return type
    b.time_slot as booking_time,
    COALESCE(b.customer_name, gu.name, 'Guest') as customer_name,
    COALESCE(b.customer_phone, gu.phone, '') as customer_phone,
    COALESCE(b.customer_email, gu.email) as customer_email,
    m.shop_name,
    m.address as shop_address,
    s.name as service_name,
    s.duration as service_duration,
    s.price as service_price,  -- This is DOUBLE PRECISION from services table
    b.stylist_name,
    b.status as booking_status,
    COALESCE(b.total_duration, s.duration) as total_duration,
    b.created_at,
    m.id::TEXT as merchant_id
  FROM public.bookings b
  JOIN public.merchants m ON b.merchant_id = m.id
  JOIN public.services s ON b.service_id = s.id
  LEFT JOIN public.guest_users gu ON b.guest_user_id = gu.id
  WHERE COALESCE(b.customer_phone, gu.phone) = p_phone_number
  ORDER BY b.created_at DESC;
END;
$$;

-- Create get_guest_bookings_for_cancellation with correct return types
CREATE OR REPLACE FUNCTION public.get_guest_bookings_for_cancellation(
  p_booking_id UUID DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL
) RETURNS TABLE(
  booking_id TEXT,
  booking_date TEXT,
  booking_time TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  shop_name TEXT,
  shop_address TEXT,
  service_name TEXT,
  service_duration INTEGER,
  service_price DOUBLE PRECISION,  -- Changed from NUMERIC to DOUBLE PRECISION
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
    b.id::TEXT as booking_id,
    b.date::TEXT as booking_date,  -- Cast to TEXT to match return type
    b.time_slot as booking_time,
    COALESCE(b.customer_name, gu.name, 'Guest') as customer_name,
    COALESCE(b.customer_phone, gu.phone, '') as customer_phone,
    COALESCE(b.customer_email, gu.email) as customer_email,
    m.shop_name,
    m.address as shop_address,
    s.name as service_name,
    s.duration as service_duration,
    s.price as service_price,  -- This is DOUBLE PRECISION from services table
    b.stylist_name,
    b.status as booking_status,
    COALESCE(b.total_duration, s.duration) as total_duration
  FROM public.bookings b
  JOIN public.merchants m ON b.merchant_id = m.id
  JOIN public.services s ON b.service_id = s.id
  LEFT JOIN public.guest_users gu ON b.guest_user_id = gu.id
  WHERE b.status = 'confirmed'
    AND (
      (p_booking_id IS NOT NULL AND b.id = p_booking_id) OR
      (p_phone_number IS NOT NULL AND COALESCE(b.customer_phone, gu.phone) = p_phone_number)
    )
  ORDER BY b.date ASC, b.time_slot ASC;
END;
$$;
