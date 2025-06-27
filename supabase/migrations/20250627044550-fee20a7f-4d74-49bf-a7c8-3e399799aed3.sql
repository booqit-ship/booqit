
-- Drop existing functions first
DROP FUNCTION IF EXISTS public.get_guest_booking_history(TEXT);
DROP FUNCTION IF EXISTS public.get_guest_bookings_for_cancellation(UUID, TEXT);

-- Fix cancel_guest_booking_safe function to remove updated_at column reference
CREATE OR REPLACE FUNCTION public.cancel_guest_booking_safe(
  p_booking_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  booking_record RECORD;
  slots_released INTEGER := 0;
BEGIN
  -- Get the booking details
  SELECT * INTO booking_record
  FROM public.bookings
  WHERE id = p_booking_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Booking not found');
  END IF;
  
  -- Check if booking can be cancelled
  IF booking_record.status = 'completed' THEN
    RETURN json_build_object('success', false, 'error', 'Cannot cancel completed booking');
  END IF;
  
  IF booking_record.status = 'cancelled' THEN
    RETURN json_build_object('success', false, 'error', 'Booking is already cancelled');
  END IF;
  
  -- Release all slots associated with this booking
  UPDATE public.stylist_time_slots
  SET is_available = true,
      booking_id = NULL
  WHERE booking_id = p_booking_id;
  
  GET DIAGNOSTICS slots_released = ROW_COUNT;
  
  -- Update booking status to cancelled (removed updated_at reference)
  UPDATE public.bookings
  SET status = 'cancelled'
  WHERE id = p_booking_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Booking cancelled successfully',
    'slots_released', slots_released
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'Failed to cancel booking: ' || SQLERRM
  );
END;
$$;

-- Enhanced get_guest_booking_receipt_data function with better structure
CREATE OR REPLACE FUNCTION public.get_guest_booking_receipt_data(
  p_booking_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  receipt_data JSON;
  booking_record RECORD;
  merchant_record RECORD;
  service_record RECORD;
  guest_record RECORD;
BEGIN
  -- Get booking details with all related information
  SELECT 
    b.*,
    m.shop_name,
    m.address as merchant_address,
    s.name as service_name,
    s.duration as service_duration,
    s.price as service_price,
    st.name as staff_name
  INTO booking_record
  FROM public.bookings b
  JOIN public.merchants m ON b.merchant_id = m.id
  JOIN public.services s ON b.service_id = s.id
  LEFT JOIN public.staff st ON b.staff_id = st.id
  WHERE b.id = p_booking_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Booking not found');
  END IF;
  
  -- Get guest user details if it's a guest booking
  IF booking_record.guest_user_id IS NOT NULL THEN
    SELECT * INTO guest_record
    FROM public.guest_users
    WHERE id = booking_record.guest_user_id;
  END IF;
  
  -- Build the receipt data structure that matches ReceiptTemplate expectations
  SELECT json_build_object(
    'success', true,
    'data', json_build_object(
      'bookingId', booking_record.id::text,
      'merchant', json_build_object(
        'shop_name', booking_record.shop_name,
        'address', booking_record.merchant_address
      ),
      'selectedServices', json_build_array(
        json_build_object(
          'id', booking_record.service_id::text,
          'name', booking_record.service_name,
          'duration', booking_record.service_duration,
          'price', booking_record.service_price
        )
      ),
      'totalPrice', booking_record.service_price,
      'bookingDate', booking_record.date::text,
      'bookingTime', booking_record.time_slot,
      'guestInfo', json_build_object(
        'name', COALESCE(booking_record.customer_name, guest_record.name, 'Guest'),
        'phone', COALESCE(booking_record.customer_phone, guest_record.phone, ''),
        'email', COALESCE(booking_record.customer_email, guest_record.email)
      ),
      'selectedStaffDetails', CASE 
        WHEN booking_record.staff_name IS NOT NULL THEN 
          json_build_object('name', booking_record.staff_name)
        ELSE null
      END
    )
  ) INTO receipt_data;
  
  RETURN receipt_data;
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false, 
    'error', 'Failed to generate receipt data: ' || SQLERRM
  );
END;
$$;

-- Function to get guest booking history
CREATE OR REPLACE FUNCTION public.get_guest_booking_history(
  p_phone_number TEXT
) RETURNS TABLE(
  booking_id TEXT,
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
  merchant_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id::text as booking_id,
    b.date as booking_date,
    b.time_slot as booking_time,
    COALESCE(b.customer_name, gu.name, 'Guest') as customer_name,
    COALESCE(b.customer_phone, gu.phone, '') as customer_phone,
    COALESCE(b.customer_email, gu.email) as customer_email,
    m.shop_name,
    m.address as shop_address,
    s.name as service_name,
    s.duration as service_duration,
    s.price as service_price,
    b.stylist_name,
    b.status as booking_status,
    COALESCE(b.total_duration, s.duration) as total_duration,
    b.created_at,
    m.id::text as merchant_id
  FROM public.bookings b
  JOIN public.merchants m ON b.merchant_id = m.id
  JOIN public.services s ON b.service_id = s.id
  LEFT JOIN public.guest_users gu ON b.guest_user_id = gu.id
  WHERE COALESCE(b.customer_phone, gu.phone) = p_phone_number
  ORDER BY b.created_at DESC;
END;
$$;

-- Function to get guest bookings for cancellation
CREATE OR REPLACE FUNCTION public.get_guest_bookings_for_cancellation(
  p_booking_id UUID DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL
) RETURNS TABLE(
  booking_id TEXT,
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
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id::text as booking_id,
    b.date as booking_date,
    b.time_slot as booking_time,
    COALESCE(b.customer_name, gu.name, 'Guest') as customer_name,
    COALESCE(b.customer_phone, gu.phone, '') as customer_phone,
    COALESCE(b.customer_email, gu.email) as customer_email,
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
  LEFT JOIN public.guest_users gu ON b.guest_user_id = gu.id
  WHERE b.status = 'confirmed'
    AND (
      (p_booking_id IS NOT NULL AND b.id = p_booking_id) OR
      (p_phone_number IS NOT NULL AND COALESCE(b.customer_phone, gu.phone) = p_phone_number)
    )
  ORDER BY b.date ASC, b.time_slot ASC;
END;
$$;
