
-- Drop all the atomic locking functions and tables that were added
DROP FUNCTION IF EXISTS public.create_atomic_multi_slot_lock(uuid, date, time, integer, integer);
DROP FUNCTION IF EXISTS public.release_atomic_multi_slot_lock(uuid, date, time, integer);
DROP FUNCTION IF EXISTS public.create_confirmed_booking_with_services(uuid, uuid, uuid, uuid, date, time, integer, text, integer);
DROP FUNCTION IF EXISTS public.cleanup_expired_locks();
DROP TABLE IF EXISTS public.slot_locks;

-- Restore the simple create_confirmed_booking function
CREATE OR REPLACE FUNCTION public.create_confirmed_booking(
  p_user_id uuid,
  p_merchant_id uuid,
  p_service_id uuid,
  p_staff_id uuid,
  p_date date,
  p_time_slot time without time zone,
  p_service_duration integer
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
  
  -- Check for overlapping confirmed bookings using service duration
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
  
  -- Create the booking with confirmed status
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
    p_time_slot::text,
    'confirmed',
    'pending',
    customer_info.name,
    customer_info.email,
    customer_info.phone,
    staff_info.name
  ) RETURNING id INTO new_booking_id;
  
  RETURN json_build_object(
    'success', true,
    'booking_id', new_booking_id,
    'message', 'Booking created successfully'
  );
END;
$$;

-- Restore the simple slot availability function
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
  buffer_minutes INTEGER;
  current_minutes INTEGER;
BEGIN
  -- Get current IST time and date (UTC+5:30)
  current_time_ist := (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::TIME;
  current_date_ist := (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::DATE;
  
  -- Calculate buffer for today (40 minutes + round up to next 10-minute interval)
  IF p_date = current_date_ist THEN
    -- Add 40 minutes buffer
    buffer_time := current_time_ist + INTERVAL '40 minutes';
    
    -- Round up to next 10-minute mark
    current_minutes := EXTRACT(minute FROM buffer_time)::INTEGER;
    buffer_minutes := CEIL(current_minutes / 10.0) * 10;
    
    -- Handle hour overflow
    IF buffer_minutes >= 60 THEN
      buffer_time := (EXTRACT(hour FROM buffer_time) + 1)::INTEGER * INTERVAL '1 hour' + (buffer_minutes - 60) * INTERVAL '1 minute';
    ELSE
      buffer_time := EXTRACT(hour FROM buffer_time)::INTEGER * INTERVAL '1 hour' + buffer_minutes * INTERVAL '1 minute';
    END IF;
  ELSE
    buffer_time := '00:00:00'::TIME;
  END IF;

  -- Get merchant hours
  SELECT open_time, close_time INTO merchant_open_time, merchant_close_time
  FROM public.merchants
  WHERE id = p_merchant_id;

  IF merchant_open_time IS NULL THEN merchant_open_time := '09:00'::TIME; END IF;
  IF merchant_close_time IS NULL THEN merchant_close_time := '18:00'::TIME; END IF;

  -- Check if it's a shop holiday
  IF EXISTS (
    SELECT 1 FROM public.shop_holidays sh
    WHERE sh.merchant_id = p_merchant_id AND sh.holiday_date = p_date
  ) THEN
    RETURN; -- No slots available on shop holidays
  END IF;

  -- Generate slots for each staff member
  FOR staff_record IN 
    SELECT s.id, s.name FROM public.staff s 
    WHERE s.merchant_id = p_merchant_id 
    AND (p_staff_id IS NULL OR s.id = p_staff_id)
  LOOP
    -- Check if staff has full day holiday
    IF EXISTS (
      SELECT 1 FROM public.stylist_holidays sh
      WHERE sh.staff_id = staff_record.id AND sh.holiday_date = p_date
    ) THEN
      CONTINUE; -- Skip this staff member
    END IF;

    slot_time := GREATEST(merchant_open_time, buffer_time);
    
    WHILE slot_time + (p_service_duration || ' minutes')::INTERVAL <= merchant_close_time LOOP
      service_end_time := slot_time + (p_service_duration || ' minutes')::INTERVAL;
      has_conflict := FALSE;
      conflict_message := NULL;

      -- Check for overlapping bookings (CONFIRMED only for simple booking)
      IF EXISTS (
        SELECT 1 FROM public.bookings b
        JOIN public.services s ON b.service_id = s.id
        WHERE b.staff_id = staff_record.id 
        AND b.date = p_date
        AND b.status = 'confirmed'
        AND NOT (
          service_end_time <= b.time_slot::time OR 
          slot_time >= (b.time_slot::time + (s.duration || ' minutes')::interval)
        )
      ) THEN
        has_conflict := TRUE;
        conflict_message := 'Time slot already booked';
      END IF;

      -- Check if service duration overlaps with any blocked time ranges
      IF NOT has_conflict AND EXISTS (
        SELECT 1 FROM public.stylist_blocked_slots sbs
        WHERE sbs.staff_id = staff_record.id 
        AND sbs.blocked_date = p_date
        AND sbs.start_time IS NOT NULL 
        AND sbs.end_time IS NOT NULL
        AND NOT (
          service_end_time <= sbs.start_time OR 
          slot_time >= sbs.end_time
        )
      ) THEN
        has_conflict := TRUE;
        conflict_message := 'Stylist not available during this time';
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
