
-- Fix slot blocking to use total service duration for multiple services

-- Update the function to properly handle multiple services total duration
CREATE OR REPLACE FUNCTION public.get_available_slots_with_ist_buffer(
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
  total_minutes INTEGER;
  buffer_minutes INTEGER;
  buffer_hours INTEGER;
  is_today BOOLEAN;
  actual_start_time TIME;
BEGIN
  -- Get current IST time and date (UTC+5:30)
  current_time_ist := (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::TIME;
  current_date_ist := (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::DATE;
  
  -- Check if the requested date is today
  is_today := (p_date = current_date_ist);
  
  RAISE LOG 'SLOT_BLOCKING: Checking slots for duration: % minutes on date: %', p_service_duration, p_date;
  
  -- Calculate buffer for today ONLY (40 minutes + round up to next 10-minute interval)
  IF is_today THEN
    total_minutes := EXTRACT(hour FROM current_time_ist)::INTEGER * 60 + EXTRACT(minute FROM current_time_ist)::INTEGER;
    total_minutes := total_minutes + 40;
    
    buffer_minutes := total_minutes % 60;
    buffer_hours := FLOOR(total_minutes / 60.0)::INTEGER;
    
    IF buffer_minutes % 10 != 0 THEN
      buffer_minutes := (FLOOR(buffer_minutes / 10.0) + 1) * 10;
    END IF;
    
    IF buffer_minutes >= 60 THEN
      buffer_hours := buffer_hours + 1;
      buffer_minutes := 0;
    END IF;
    
    IF buffer_hours >= 24 THEN
      buffer_hours := 23;
      buffer_minutes := 50;
    END IF;
    
    buffer_time := (buffer_hours || ':' || LPAD(buffer_minutes::text, 2, '0'))::TIME;
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
    RETURN;
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
      CONTINUE;
    END IF;

    -- Set actual start time
    IF is_today THEN
      actual_start_time := GREATEST(merchant_open_time, buffer_time);
      IF buffer_time >= merchant_close_time THEN
        CONTINUE;
      END IF;
    ELSE
      actual_start_time := merchant_open_time;
    END IF;
    
    slot_time := actual_start_time;
    
    -- Generate slots every 10 minutes until closing time
    WHILE slot_time + (p_service_duration || ' minutes')::INTERVAL <= merchant_close_time LOOP
      service_end_time := slot_time + (p_service_duration || ' minutes')::INTERVAL;
      has_conflict := FALSE;
      conflict_message := NULL;

      -- CRITICAL FIX: Check for overlapping bookings using TOTAL DURATION from bookings table
      IF EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.staff_id = staff_record.id 
        AND b.date = p_date
        AND b.status IN ('confirmed', 'pending', 'completed')
        AND NOT (
          -- Use total_duration if available, otherwise fall back to single service duration
          service_end_time <= b.time_slot::time OR 
          slot_time >= (b.time_slot::time + (COALESCE(b.total_duration, 30) || ' minutes')::interval)
        )
      ) THEN
        has_conflict := TRUE;
        
        SELECT CASE 
          WHEN b.status = 'pending' THEN 'Time slot is currently reserved'
          WHEN b.status = 'confirmed' THEN 'Time slot already booked'
          WHEN b.status = 'completed' THEN 'Time slot already used'
          ELSE 'Time slot unavailable'
        END
        INTO conflict_message
        FROM public.bookings b
        WHERE b.staff_id = staff_record.id 
        AND b.date = p_date
        AND b.status IN ('confirmed', 'pending', 'completed')
        AND NOT (
          service_end_time <= b.time_slot::time OR 
          slot_time >= (b.time_slot::time + (COALESCE(b.total_duration, 30) || ' minutes')::interval)
        )
        LIMIT 1;
        
        RAISE LOG 'SLOT_BLOCKING: Conflict found for slot % - %', slot_time, conflict_message;
      END IF;

      -- Check blocked time ranges
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

-- Update function to create booking with multiple services and proper slot blocking
CREATE OR REPLACE FUNCTION public.create_booking_with_services(
  p_user_id uuid,
  p_merchant_id uuid,
  p_staff_id uuid,
  p_date date,
  p_time_slot text,
  p_services jsonb,
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
  start_time time;
  end_time time;
  overlapping_count integer;
BEGIN
  RAISE LOG 'BOOKING_CREATION: Creating booking with total duration: % minutes', p_total_duration;
  
  -- Convert time slot to time type
  start_time := p_time_slot::time;
  end_time := start_time + (p_total_duration || ' minutes')::interval;
  
  RAISE LOG 'BOOKING_CREATION: Time range: % to % (duration: % min)', start_time, end_time, p_total_duration;
  
  -- Check for overlapping bookings using TOTAL DURATION
  SELECT COUNT(*) INTO overlapping_count
  FROM public.bookings b
  WHERE b.staff_id = p_staff_id
  AND b.date = p_date
  AND b.status IN ('confirmed', 'pending')
  AND NOT (
    -- No overlap: new booking ends before existing starts OR new booking starts after existing ends
    end_time <= b.time_slot::time OR 
    start_time >= (b.time_slot::time + (COALESCE(b.total_duration, 30) || ' minutes')::interval)
  );
  
  IF overlapping_count > 0 THEN
    RAISE LOG 'BOOKING_CREATION: Overlap detected with % existing bookings', overlapping_count;
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
    
    SELECT name, email, phone INTO customer_info
    FROM public.profiles
    WHERE id = p_user_id;
  END IF;
  
  -- Get staff info
  SELECT name INTO staff_info
  FROM public.staff
  WHERE id = p_staff_id;
  
  -- Create the booking with multiple services and total duration
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
    (p_services->0->>'id')::uuid, -- Primary service for compatibility
    p_staff_id,
    p_date,
    p_time_slot,
    'pending',
    'pending',
    customer_info.name,
    customer_info.email,
    customer_info.phone,
    staff_info.name,
    p_services,
    p_total_duration
  ) RETURNING id INTO new_booking_id;
  
  RAISE LOG 'BOOKING_CREATION: Successfully created booking % with total duration %', new_booking_id, p_total_duration;
  
  RETURN json_build_object(
    'success', true,
    'booking_id', new_booking_id,
    'message', 'Booking created successfully with total duration: ' || p_total_duration || ' minutes'
  );
END;
$$;
