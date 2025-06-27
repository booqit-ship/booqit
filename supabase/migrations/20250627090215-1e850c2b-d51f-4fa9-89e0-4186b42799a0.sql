
-- Complete fix for guest booking functions type mismatches
-- This migration drops and recreates both functions with correct return types

-- Drop existing functions completely
DROP FUNCTION IF EXISTS public.get_guest_booking_history(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_guest_bookings_for_cancellation(uuid, text) CASCADE;

-- Recreate get_guest_booking_history with correct types
CREATE OR REPLACE FUNCTION public.get_guest_booking_history(p_phone_number text)
RETURNS TABLE(
  booking_id uuid,
  booking_date date,
  booking_time text,
  customer_name text,
  customer_phone text,
  customer_email text,
  shop_name text,
  shop_address text,
  service_name text,
  service_duration integer,
  service_price double precision,
  stylist_name text,
  booking_status text,
  total_duration integer,
  created_at timestamp with time zone,
  merchant_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id::uuid as booking_id,
    b.date as booking_date,
    b.time_slot as booking_time,
    b.customer_name,
    b.customer_phone,
    b.customer_email,
    m.shop_name,
    m.address as shop_address,
    s.name as service_name,
    s.duration as service_duration,
    s.price::double precision as service_price,
    b.stylist_name,
    b.status as booking_status,
    COALESCE(b.total_duration, s.duration) as total_duration,
    b.created_at,
    m.id::uuid as merchant_id
  FROM public.bookings b
  JOIN public.merchants m ON b.merchant_id = m.id
  JOIN public.services s ON b.service_id = s.id
  WHERE b.customer_phone = p_phone_number
  ORDER BY b.created_at DESC;
END;
$$;

-- Recreate get_guest_bookings_for_cancellation with correct types
CREATE OR REPLACE FUNCTION public.get_guest_bookings_for_cancellation(p_booking_id uuid DEFAULT NULL, p_phone_number text DEFAULT NULL)
RETURNS TABLE(
  booking_id uuid,
  booking_date date,
  booking_time text,
  customer_name text,
  customer_phone text,
  customer_email text,
  shop_name text,
  shop_address text,
  service_name text,
  service_duration integer,
  service_price double precision,
  stylist_name text,
  booking_status text,
  total_duration integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id::uuid as booking_id,
    b.date as booking_date,
    b.time_slot as booking_time,
    b.customer_name,
    b.customer_phone,
    b.customer_email,
    m.shop_name,
    m.address as shop_address,
    s.name as service_name,
    s.duration as service_duration,
    s.price::double precision as service_price,
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
  ORDER BY b.date ASC, b.time_slot ASC;
END;
$$;

-- Fixed cancel function - removed the non-existent updated_at column
CREATE OR REPLACE FUNCTION public.cancel_guest_booking_safe(p_booking_id uuid)
RETURNS json
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
    RETURN json_build_object(
      'success', false,
      'error', 'Booking not found or cannot be cancelled'
    );
  END IF;
  
  -- Update booking status to cancelled (removed updated_at since column doesn't exist)
  UPDATE public.bookings
  SET status = 'cancelled'
  WHERE id = p_booking_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Booking cancelled successfully'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'Failed to cancel booking: ' || SQLERRM
  );
END;
$$;

-- Create the receipt data function with correct types
CREATE OR REPLACE FUNCTION public.get_guest_booking_receipt_data(p_booking_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  booking_data RECORD;
  services_data JSON;
  result_data JSON;
BEGIN
  -- Get booking and merchant data
  SELECT 
    b.id as booking_id,
    b.date as booking_date,
    b.time_slot as booking_time,
    b.customer_name,
    b.customer_phone,
    b.customer_email,
    b.stylist_name,
    m.shop_name,
    m.address,
    s.name as service_name,
    s.duration as service_duration,
    s.price::double precision as service_price
  INTO booking_data
  FROM public.bookings b
  JOIN public.merchants m ON b.merchant_id = m.id
  JOIN public.services s ON b.service_id = s.id
  WHERE b.id = p_booking_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking not found'
    );
  END IF;
  
  -- Format services data
  services_data := json_build_array(
    json_build_object(
      'id', booking_data.booking_id,
      'name', booking_data.service_name,
      'duration', booking_data.service_duration,
      'price', booking_data.service_price
    )
  );
  
  -- Build result data
  result_data := json_build_object(
    'bookingId', booking_data.booking_id,
    'merchant', json_build_object(
      'shop_name', booking_data.shop_name,
      'address', booking_data.address
    ),
    'selectedServices', services_data,
    'totalPrice', booking_data.service_price,
    'bookingDate', booking_data.booking_date,
    'bookingTime', booking_data.booking_time,
    'guestInfo', json_build_object(
      'name', booking_data.customer_name,
      'phone', booking_data.customer_phone,
      'email', booking_data.customer_email
    ),
    'selectedStaffDetails', CASE 
      WHEN booking_data.stylist_name IS NOT NULL THEN
        json_build_object('name', booking_data.stylist_name)
      ELSE NULL
    END
  );
  
  RETURN json_build_object(
    'success', true,
    'data', result_data
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'Failed to get receipt data: ' || SQLERRM
  );
END;
$$;
