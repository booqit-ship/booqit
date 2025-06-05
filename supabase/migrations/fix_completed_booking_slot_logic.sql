
-- Fix slot availability logic to keep completed bookings as blocking slots
-- Only cancelled bookings should free up slots

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

      -- Check for overlapping bookings (CONFIRMED, PENDING, and COMPLETED block slots - only CANCELLED releases them)
      IF EXISTS (
        SELECT 1 FROM public.bookings b
        JOIN public.services s ON b.service_id = s.id
        WHERE b.staff_id = staff_record.id 
        AND b.date = p_date
        AND b.status IN ('confirmed', 'pending', 'completed')  -- Include completed bookings as blocking
        AND NOT (
          service_end_time <= b.time_slot::time OR 
          slot_time >= (b.time_slot::time + (s.duration || ' minutes')::interval)
        )
      ) THEN
        has_conflict := TRUE;
        
        -- Get specific conflict reason based on booking status
        SELECT CASE 
          WHEN b.status = 'pending' THEN 'Time slot is currently reserved'
          WHEN b.status = 'confirmed' THEN 'Time slot already booked'
          WHEN b.status = 'completed' THEN 'Time slot already used'
          ELSE 'Time slot unavailable'
        END
        INTO conflict_message
        FROM public.bookings b
        JOIN public.services s ON b.service_id = s.id
        WHERE b.staff_id = staff_record.id 
        AND b.date = p_date
        AND b.status IN ('confirmed', 'pending', 'completed')
        AND NOT (
          service_end_time <= b.time_slot::time OR 
          slot_time >= (b.time_slot::time + (s.duration || ' minutes')::interval)
        )
        LIMIT 1;
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

-- Update the other slot availability functions to follow the same logic
CREATE OR REPLACE FUNCTION public.get_available_slots_current_time(
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
  current_minutes INTEGER;
  rounded_minutes INTEGER;
BEGIN
  -- Get current IST time and date (UTC+5:30)
  current_time_ist := (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::TIME;
  current_date_ist := (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::DATE;
  
  -- Calculate buffer for today only (40 minutes + round up to next 10-minute interval)
  IF p_date = current_date_ist THEN
    -- Add 40 minutes buffer
    buffer_time := current_time_ist + INTERVAL '40 minutes';
    
    -- Round up to next 10-minute mark
    current_minutes := EXTRACT(minute FROM buffer_time)::INTEGER;
    rounded_minutes := CEIL(current_minutes / 10.0) * 10;
    
    -- Handle hour overflow
    IF rounded_minutes >= 60 THEN
      buffer_time := (EXTRACT(hour FROM buffer_time) + 1)::INTEGER * INTERVAL '1 hour' + (rounded_minutes - 60) * INTERVAL '1 minute';
    ELSE
      buffer_time := EXTRACT(hour FROM buffer_time)::INTEGER * INTERVAL '1 hour' + rounded_minutes * INTERVAL '1 minute';
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

    -- For today: start from buffer_time, for future dates: start from open_time
    slot_time := GREATEST(merchant_open_time, buffer_time);
    
    WHILE slot_time + (p_service_duration || ' minutes')::INTERVAL <= merchant_close_time LOOP
      service_end_time := slot_time + (p_service_duration || ' minutes')::INTERVAL;
      has_conflict := FALSE;
      conflict_message := NULL;

      -- Check for overlapping bookings (CONFIRMED, PENDING, and COMPLETED block slots - only CANCELLED releases them)
      IF EXISTS (
        SELECT 1 FROM public.bookings b
        JOIN public.services s ON b.service_id = s.id
        WHERE b.staff_id = staff_record.id 
        AND b.date = p_date
        AND b.status IN ('confirmed', 'pending', 'completed')  -- Include completed bookings as blocking
        AND NOT (
          service_end_time <= b.time_slot::time OR 
          slot_time >= (b.time_slot::time + (s.duration || ' minutes')::interval)
        )
      ) THEN
        has_conflict := TRUE;
        
        -- Get specific conflict reason
        SELECT CASE 
          WHEN b.status = 'pending' THEN 'Time slot is currently reserved'
          WHEN b.status = 'confirmed' THEN 'Time slot already booked'
          WHEN b.status = 'completed' THEN 'Time slot already used'
          ELSE 'Time slot unavailable'
        END
        INTO conflict_message
        FROM public.bookings b
        JOIN public.services s ON b.service_id = s.id
        WHERE b.staff_id = staff_record.id 
        AND b.date = p_date
        AND b.status IN ('confirmed', 'pending', 'completed')
        AND NOT (
          service_end_time <= b.time_slot::time OR 
          slot_time >= (b.time_slot::time + (s.duration || ' minutes')::interval)
        )
        LIMIT 1;
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

-- Update the validation function as well
CREATE OR REPLACE FUNCTION public.get_available_slots_with_validation(
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
  slot_record RECORD;
  service_end_time TIME;
  has_conflict BOOLEAN;
  conflict_message TEXT;
  overlapping_booking_count INTEGER;
BEGIN
  -- First ensure slots are generated for this date
  PERFORM public.get_fresh_available_slots(p_merchant_id, p_date, p_staff_id);
  
  -- Now validate each slot based on service duration
  FOR slot_record IN 
    SELECT * FROM public.get_fresh_available_slots(p_merchant_id, p_date, p_staff_id)
  LOOP
    service_end_time := slot_record.time_slot + (p_service_duration || ' minutes')::INTERVAL;
    has_conflict := FALSE;
    conflict_message := NULL;

    -- If slot is already marked as unavailable from generation
    IF slot_record.slot_status != 'Available' THEN
      has_conflict := TRUE;
      conflict_message := slot_record.status_reason;
    ELSE
      -- Check if service duration would overlap with any existing bookings (CONFIRMED, PENDING, and COMPLETED)
      SELECT COUNT(*) INTO overlapping_booking_count
      FROM public.bookings b
      JOIN public.services s ON b.service_id = s.id
      WHERE b.staff_id = slot_record.staff_id
      AND b.date = p_date
      AND b.status IN ('confirmed', 'pending', 'completed')  -- Include completed bookings as blocking
      AND NOT (
        -- No overlap: new service ends before existing starts OR new service starts after existing ends
        service_end_time <= b.time_slot::time OR 
        slot_record.time_slot >= (b.time_slot::time + (s.duration || ' minutes')::interval)
      );

      IF overlapping_booking_count > 0 THEN
        has_conflict := TRUE;
        conflict_message := 'Service duration would overlap with existing booking';
      END IF;

      -- Check if service would extend past merchant closing time
      IF service_end_time > (SELECT close_time FROM public.merchants WHERE id = p_merchant_id) THEN
        has_conflict := TRUE;
        conflict_message := 'Service would extend past closing time';
      END IF;
    END IF;

    -- Return the slot with availability status
    RETURN QUERY SELECT 
      slot_record.staff_id,
      slot_record.staff_name,
      slot_record.time_slot,
      NOT has_conflict,
      conflict_message;
  END LOOP;
END;
$$;

-- Update the slot generation function to include completed bookings
CREATE OR REPLACE FUNCTION public.get_fresh_available_slots(
  p_merchant_id uuid, 
  p_date date, 
  p_staff_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  staff_id uuid, 
  staff_name text, 
  time_slot time without time zone, 
  slot_status text, 
  status_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  merchant_open_time TIME;
  merchant_close_time TIME;
  current_time_ist TIME;
  current_date_ist DATE;
  buffer_time TIME;
  slot_time TIME;
  slot_interval INTERVAL := '10 minutes';
  staff_record RECORD;
  is_today BOOLEAN;
  is_shop_holiday BOOLEAN;
  is_stylist_holiday BOOLEAN;
  is_slot_booked BOOLEAN;
  is_time_blocked BOOLEAN;
  slot_status_val TEXT;
  status_reason_val TEXT;
BEGIN
  -- Convert current UTC time to IST (UTC+5:30)
  current_time_ist := (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::TIME;
  current_date_ist := (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::DATE;
  
  RAISE LOG 'Generating slots for merchant % on date %', p_merchant_id, p_date;
  
  -- Check if the requested date is today
  is_today := p_date = current_date_ist;
  
  -- Get merchant operating hours
  SELECT open_time, close_time INTO merchant_open_time, merchant_close_time
  FROM public.merchants
  WHERE id = p_merchant_id;

  IF NOT FOUND THEN
    RAISE LOG 'Merchant not found: %', p_merchant_id;
    RETURN;
  END IF;

  IF merchant_open_time IS NULL OR merchant_close_time IS NULL THEN
    RAISE LOG 'Merchant operating hours not set for merchant: %', p_merchant_id;
    RETURN;
  END IF;

  RAISE LOG 'Merchant hours: % to %', merchant_open_time, merchant_close_time;

  -- Check if it's a shop holiday
  SELECT EXISTS (
    SELECT 1 FROM public.shop_holidays 
    WHERE merchant_id = p_merchant_id AND holiday_date = p_date
  ) INTO is_shop_holiday;

  IF is_shop_holiday THEN
    RAISE LOG 'Shop holiday on date: %', p_date;
    RETURN;
  END IF;

  -- Calculate buffer time for today (40 minutes + round up to next 10-minute mark)
  IF is_today THEN
    buffer_time := (current_time_ist + INTERVAL '40 minutes')::TIME;
    -- Round up to next 10-minute interval
    buffer_time := (DATE_TRUNC('hour', '2000-01-01'::timestamp + buffer_time) + 
                   INTERVAL '10 minutes' * CEIL(EXTRACT(MINUTE FROM buffer_time) / 10))::TIME;
    RAISE LOG 'Today buffer time: %', buffer_time;
  ELSE
    buffer_time := '00:00:00'::TIME;
  END IF;

  -- Loop through staff members
  FOR staff_record IN 
    SELECT s.id, s.name FROM public.staff s 
    WHERE s.merchant_id = p_merchant_id 
    AND (p_staff_id IS NULL OR s.id = p_staff_id)
    ORDER BY s.name
  LOOP
    RAISE LOG 'Processing staff: % (%)', staff_record.name, staff_record.id;
    
    -- Check if staff has full day holiday
    SELECT EXISTS (
      SELECT 1 FROM public.stylist_holidays 
      WHERE staff_id = staff_record.id AND holiday_date = p_date
    ) INTO is_stylist_holiday;

    IF is_stylist_holiday THEN
      RAISE LOG 'Staff % has holiday on %', staff_record.name, p_date;
      CONTINUE;
    END IF;

    -- Generate time slots for this staff member
    slot_time := GREATEST(merchant_open_time, buffer_time);
    
    WHILE slot_time < merchant_close_time LOOP
      -- Reset flags for each slot
      is_slot_booked := FALSE;
      is_time_blocked := FALSE;
      slot_status_val := 'Available';
      status_reason_val := NULL;

      -- Check if slot is booked (confirmed, pending, or completed bookings - only cancelled releases slots)
      SELECT EXISTS (
        SELECT 1 FROM public.bookings 
        WHERE staff_id = staff_record.id 
        AND date = p_date
        AND time_slot = slot_time::text
        AND status IN ('confirmed', 'pending', 'completed')  -- Include completed bookings as blocking
      ) INTO is_slot_booked;

      IF is_slot_booked THEN
        -- Get the specific status for better messaging
        SELECT CASE 
          WHEN status = 'pending' THEN 'Reserved'
          WHEN status = 'confirmed' THEN 'Booked'
          WHEN status = 'completed' THEN 'Used'
          ELSE 'Unavailable'
        END,
        CASE 
          WHEN status = 'pending' THEN 'Currently reserved by another customer'
          WHEN status = 'confirmed' THEN 'Already booked by another customer'
          WHEN status = 'completed' THEN 'Time slot already used'
          ELSE 'Time slot unavailable'
        END
        INTO slot_status_val, status_reason_val
        FROM public.bookings 
        WHERE staff_id = staff_record.id 
        AND date = p_date
        AND time_slot = slot_time::text
        AND status IN ('confirmed', 'pending', 'completed')
        LIMIT 1;
      ELSE
        -- Check if slot is in blocked time range
        SELECT EXISTS (
          SELECT 1 FROM public.stylist_blocked_slots 
          WHERE staff_id = staff_record.id 
          AND blocked_date = p_date
          AND start_time IS NOT NULL 
          AND end_time IS NOT NULL
          AND slot_time >= start_time 
          AND slot_time < end_time
        ) INTO is_time_blocked;

        IF is_time_blocked THEN
          slot_status_val := 'Blocked';
          SELECT CONCAT('Blocked from ', TO_CHAR(start_time, 'HH24:MI'), ' to ', TO_CHAR(end_time, 'HH24:MI'))
          INTO status_reason_val
          FROM public.stylist_blocked_slots 
          WHERE staff_id = staff_record.id 
          AND blocked_date = p_date
          AND start_time IS NOT NULL 
          AND end_time IS NOT NULL
          AND slot_time >= start_time 
          AND slot_time < end_time
          LIMIT 1;
        END IF;
      END IF;

      -- Return the slot
      RETURN QUERY SELECT 
        staff_record.id,
        staff_record.name,
        slot_time,
        slot_status_val,
        status_reason_val;

      -- Move to next slot (10-minute intervals)
      slot_time := slot_time + slot_interval;
    END LOOP;
  END LOOP;
  
  RAISE LOG 'Finished generating slots for merchant % on date %', p_merchant_id, p_date;
END;
$$;
