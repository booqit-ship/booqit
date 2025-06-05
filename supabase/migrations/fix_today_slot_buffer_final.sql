
-- Fix today's slot generation to properly apply IST timing with 40-minute buffer
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
  buffer_time_with_minutes TIMESTAMP;
BEGIN
  -- Get current IST time and date (UTC+5:30)
  current_time_ist := (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::TIME;
  current_date_ist := (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::DATE;
  
  RAISE LOG 'Current IST time: %, Current IST date: %, Request date: %', current_time_ist, current_date_ist, p_date;
  
  -- Calculate buffer for today ONLY (40 minutes + round up to next 10-minute interval)
  IF p_date = current_date_ist THEN
    -- Create a timestamp for easier calculation
    buffer_time_with_minutes := (current_date_ist + current_time_ist + INTERVAL '40 minutes');
    
    -- Extract minutes and round up to next 10-minute mark
    current_minutes := EXTRACT(minute FROM buffer_time_with_minutes)::INTEGER;
    buffer_minutes := CASE 
      WHEN current_minutes % 10 = 0 THEN current_minutes
      ELSE (FLOOR(current_minutes / 10.0) + 1) * 10
    END;
    
    RAISE LOG 'Original minutes: %, Rounded minutes: %', current_minutes, buffer_minutes;
    
    -- Handle hour overflow and create final buffer time
    IF buffer_minutes >= 60 THEN
      buffer_time := (EXTRACT(hour FROM buffer_time_with_minutes) + 1)::INTEGER * INTERVAL '1 hour' + 
                     (buffer_minutes - 60) * INTERVAL '1 minute';
    ELSE
      buffer_time := EXTRACT(hour FROM buffer_time_with_minutes)::INTEGER * INTERVAL '1 hour' + 
                     buffer_minutes * INTERVAL '1 minute';
    END IF;
    
    RAISE LOG 'Final buffer time for today: %', buffer_time;
  ELSE
    -- For future dates, no buffer needed - start from shop opening
    buffer_time := '00:00:00'::TIME;
    RAISE LOG 'Future date, no buffer applied';
  END IF;

  -- Get merchant hours
  SELECT open_time, close_time INTO merchant_open_time, merchant_close_time
  FROM public.merchants
  WHERE id = p_merchant_id;

  IF merchant_open_time IS NULL THEN merchant_open_time := '09:00'::TIME; END IF;
  IF merchant_close_time IS NULL THEN merchant_close_time := '18:00'::TIME; END IF;

  RAISE LOG 'Merchant hours: % to %', merchant_open_time, merchant_close_time;

  -- Check if it's a shop holiday
  IF EXISTS (
    SELECT 1 FROM public.shop_holidays sh
    WHERE sh.merchant_id = p_merchant_id AND sh.holiday_date = p_date
  ) THEN
    RAISE LOG 'Shop holiday on date: %', p_date;
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

    -- For today: start from buffer_time, for future dates: start from open_time
    slot_time := GREATEST(merchant_open_time, buffer_time);
    RAISE LOG 'Starting slot generation from: % for staff: %', slot_time, staff_record.name;
    
    -- Only generate slots if there's time left in the day
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
        AND b.status IN ('confirmed', 'pending', 'completed')
        AND NOT (
          service_end_time <= b.time_slot::time OR 
          slot_time >= (b.time_slot::time + (s.duration || ' minutes')::interval)
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
