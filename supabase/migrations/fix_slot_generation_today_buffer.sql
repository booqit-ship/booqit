
-- Fix slot generation to start from buffer time for today only
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
  current_minutes INTEGER;
  buffer_minutes INTEGER;
  buffer_hours INTEGER;
  total_minutes INTEGER;
  is_today BOOLEAN;
  actual_start_time TIME;
BEGIN
  -- Get current IST time and date (UTC+5:30)
  current_time_ist := (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::TIME;
  current_date_ist := (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::DATE;
  
  -- Check if the requested date is today
  is_today := (p_date = current_date_ist);
  
  RAISE LOG 'Current IST time: %, Current IST date: %, Request date: %, Is today: %', 
    current_time_ist, current_date_ist, p_date, is_today;
  
  -- Calculate buffer for today ONLY (40 minutes + round up to next 10-minute interval)
  IF is_today THEN
    -- Convert current time to total minutes
    total_minutes := EXTRACT(hour FROM current_time_ist)::INTEGER * 60 + EXTRACT(minute FROM current_time_ist)::INTEGER;
    RAISE LOG 'Current time in minutes: %', total_minutes;
    
    -- Add 40 minutes buffer
    total_minutes := total_minutes + 40;
    RAISE LOG 'Time with 40min buffer in minutes: %', total_minutes;
    
    -- Round up to next 10-minute interval
    current_minutes := total_minutes % 60;
    buffer_minutes := CASE 
      WHEN current_minutes % 10 = 0 THEN current_minutes
      ELSE (FLOOR(current_minutes / 10.0) + 1) * 10
    END;
    
    -- Calculate hours and handle overflow
    buffer_hours := FLOOR(total_minutes / 60.0)::INTEGER;
    IF buffer_minutes >= 60 THEN
      buffer_hours := buffer_hours + 1;
      buffer_minutes := buffer_minutes - 60;
    END IF;
    
    -- Ensure we don't go past 24 hours
    IF buffer_hours >= 24 THEN
      buffer_hours := 23;
      buffer_minutes := 50; -- Last possible slot
    END IF;
    
    buffer_time := (buffer_hours || ':' || LPAD(buffer_minutes::text, 2, '0'))::TIME;
    
    RAISE LOG 'Final buffer time for today: % (hours: %, minutes: %)', buffer_time, buffer_hours, buffer_minutes;
  ELSE
    -- For future dates, no buffer applied
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

    -- CRITICAL: For today, start from buffer_time ONLY, for future dates: start from open_time
    IF is_today THEN
      actual_start_time := GREATEST(merchant_open_time, buffer_time);
      -- If buffer time is past closing time, no slots available
      IF buffer_time >= merchant_close_time THEN
        RAISE LOG 'Buffer time % is past closing time % - no slots available for staff %', 
          buffer_time, merchant_close_time, staff_record.name;
        CONTINUE;
      END IF;
    ELSE
      actual_start_time := merchant_open_time;
    END IF;
    
    slot_time := actual_start_time;
    RAISE LOG 'Starting slot generation from: % for staff: % (is_today: %)', 
      slot_time, staff_record.name, is_today;
    
    -- Generate slots every 10 minutes until closing time
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

      -- Return the slot
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
