
-- Drop old functions that reference stylist_time_slots
DROP FUNCTION IF EXISTS public.book_appointment_with_duration_blocking(uuid, uuid, date, time, integer);
DROP FUNCTION IF EXISTS public.handle_booking_slot_allocation();
DROP TRIGGER IF EXISTS trigger_allocate_booking_slots ON public.bookings;

-- Simple function to book a slot immediately
CREATE OR REPLACE FUNCTION public.book_slot_immediately(
  p_user_id uuid,
  p_merchant_id uuid,
  p_service_id uuid,
  p_staff_id uuid,
  p_date date,
  p_time_slot text,
  p_service_duration integer
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_booking_id uuid;
  customer_info record;
  staff_info record;
  start_time time;
  end_time time;
  overlapping_count integer;
BEGIN
  -- Convert time slot to time type
  start_time := p_time_slot::time;
  end_time := start_time + (p_service_duration || ' minutes')::interval;
  
  -- Check for overlapping bookings (only confirmed and pending)
  SELECT COUNT(*) INTO overlapping_count
  FROM public.bookings b
  JOIN public.services s ON b.service_id = s.id
  WHERE b.staff_id = p_staff_id
  AND b.date = p_date
  AND b.status IN ('confirmed', 'pending')
  AND NOT (
    -- No overlap: new booking ends before existing starts OR new booking starts after existing ends
    end_time <= b.time_slot::time OR 
    start_time >= (b.time_slot::time + (s.duration || ' minutes')::interval)
  );
  
  IF overlapping_count > 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Time slot already booked'
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
  
  -- Create the booking immediately as pending
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
    stylist_name
  ) VALUES (
    p_user_id,
    p_merchant_id,
    p_service_id,
    p_staff_id,
    p_date,
    p_time_slot,
    'pending',
    'pending',
    customer_info.name,
    customer_info.email,
    customer_info.phone,
    staff_info.name
  ) RETURNING id INTO new_booking_id;
  
  RETURN json_build_object(
    'success', true,
    'booking_id', new_booking_id,
    'message', 'Slot booked successfully'
  );
END;
$$;

-- Function to confirm booking after payment
CREATE OR REPLACE FUNCTION public.confirm_booking_payment(
  p_booking_id uuid,
  p_user_id uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update booking to confirmed
  UPDATE public.bookings
  SET status = 'confirmed',
      payment_status = 'completed',
      updated_at = now()
  WHERE id = p_booking_id
    AND user_id = p_user_id
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking not found or already confirmed'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Booking confirmed successfully'
  );
END;
$$;

-- Function to cancel booking (frees the slot)
CREATE OR REPLACE FUNCTION public.cancel_booking_simple(
  p_booking_id uuid,
  p_user_id uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update booking to cancelled
  UPDATE public.bookings
  SET status = 'cancelled',
      updated_at = now()
  WHERE id = p_booking_id
    AND user_id = p_user_id
    AND status IN ('pending', 'confirmed');
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking not found or cannot be cancelled'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Booking cancelled successfully'
  );
END;
$$;

-- Update the slot generation to check only bookings table
CREATE OR REPLACE FUNCTION public.get_available_slots_simple(
  p_merchant_id uuid, 
  p_date date, 
  p_staff_id uuid DEFAULT NULL::uuid, 
  p_service_duration integer DEFAULT 30
)
RETURNS TABLE(
  staff_id uuid, 
  staff_name text, 
  time_slot time without time zone, 
  is_available boolean, 
  conflict_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_time_ist TIME;
  current_date_ist DATE;
  buffer_time TIME;
  merchant_open_time TIME;
  merchant_close_time TIME;
  slot_time TIME;
  staff_record RECORD;
  service_end_time TIME;
  has_conflict BOOLEAN;
  conflict_message TEXT;
BEGIN
  -- Get current IST time
  current_time_ist := (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::TIME;
  current_date_ist := (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::DATE;
  
  -- Calculate buffer for today (40 minutes + round up)
  IF p_date = current_date_ist THEN
    buffer_time := current_time_ist + INTERVAL '40 minutes';
    -- Round up to next 10-minute mark
    buffer_time := (EXTRACT(hour FROM buffer_time) * 60 + 
                   CEIL(EXTRACT(minute FROM buffer_time) / 10) * 10) * INTERVAL '1 minute';
  ELSE
    buffer_time := '00:00:00'::TIME;
  END IF;

  -- Get merchant hours
  SELECT open_time, close_time INTO merchant_open_time, merchant_close_time
  FROM public.merchants
  WHERE id = p_merchant_id;

  IF merchant_open_time IS NULL THEN merchant_open_time := '09:00'::TIME; END IF;
  IF merchant_close_time IS NULL THEN merchant_close_time := '18:00'::TIME; END IF;

  -- Generate slots for each staff member
  FOR staff_record IN 
    SELECT s.id, s.name FROM public.staff s 
    WHERE s.merchant_id = p_merchant_id 
    AND (p_staff_id IS NULL OR s.id = p_staff_id)
  LOOP
    slot_time := GREATEST(merchant_open_time, buffer_time);
    
    WHILE slot_time + (p_service_duration || ' minutes')::INTERVAL <= merchant_close_time LOOP
      service_end_time := slot_time + (p_service_duration || ' minutes')::INTERVAL;
      has_conflict := FALSE;
      conflict_message := NULL;

      -- Check for overlapping bookings
      IF EXISTS (
        SELECT 1 FROM public.bookings b
        JOIN public.services s ON b.service_id = s.id
        WHERE b.staff_id = staff_record.id 
        AND b.date = p_date
        AND b.status IN ('pending', 'confirmed')
        AND NOT (
          service_end_time <= b.time_slot::time OR 
          slot_time >= (b.time_slot::time + (s.duration || ' minutes')::interval)
        )
      ) THEN
        has_conflict := TRUE;
        conflict_message := 'Time slot already booked';
      END IF;

      RETURN QUERY SELECT 
        staff_record.id,
        staff_record.name,
        slot_time,
        NOT has_conflict,
        conflict_message;

      slot_time := slot_time + INTERVAL '10 minutes';
    END LOOP;
  END LOOP;
END;
$$;
