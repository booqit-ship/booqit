
-- Ensure the correct slot function is deployed with proper IST buffer logic
DROP FUNCTION IF EXISTS public.get_available_slots_with_ist_buffer(uuid, date, uuid, integer);

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
  
  -- CRITICAL: Check if the requested date is today in IST
  is_today := (p_date = current_date_ist);
  
  RAISE LOG 'SLOT_AUDIT: Current IST time: %, Current IST date: %, Request date: %, Is today: %', 
    current_time_ist, current_date_ist, p_date, is_today;
  
  -- Calculate buffer for today ONLY (40 minutes + round up to next 10-minute interval)
  IF is_today THEN
    -- Convert current time to total minutes (same logic as frontend)
    total_minutes := EXTRACT(hour FROM current_time_ist)::INTEGER * 60 + EXTRACT(minute FROM current_time_ist)::INTEGER;
    RAISE LOG 'SLOT_AUDIT: Current time in minutes: %', total_minutes;
    
    -- Add 40 minutes buffer
    total_minutes := total_minutes + 40;
    RAISE LOG 'SLOT_AUDIT: Time with 40min buffer in minutes: %', total_minutes;
    
    -- Calculate hours and minutes
    buffer_minutes := total_minutes % 60;
    buffer_hours := FLOOR(total_minutes / 60.0)::INTEGER;
    
    -- Round minutes up to next 10-minute mark (CRITICAL LOGIC)
    IF buffer_minutes % 10 != 0 THEN
      buffer_minutes := (FLOOR(buffer_minutes / 10.0) + 1) * 10;
    END IF;
    
    -- Handle minute overflow
    IF buffer_minutes >= 60 THEN
      buffer_hours := buffer_hours + 1;
      buffer_minutes := 0;
    END IF;
    
    -- Ensure we don't go past 24 hours
    IF buffer_hours >= 24 THEN
      buffer_hours := 23;
      buffer_minutes := 50;
    END IF;
    
    buffer_time := (buffer_hours || ':' || LPAD(buffer_minutes::text, 2, '0'))::TIME;
    
    RAISE LOG 'SLOT_AUDIT: Final buffer time for today: % (hours: %, minutes: %)', buffer_time, buffer_hours, buffer_minutes;
  ELSE
    -- For future dates, no buffer applied
    buffer_time := '00:00:00'::TIME;
    RAISE LOG 'SLOT_AUDIT: Future date, no buffer applied';
  END IF;

  -- Get merchant hours
  SELECT open_time, close_time INTO merchant_open_time, merchant_close_time
  FROM public.merchants
  WHERE id = p_merchant_id;

  -- Default hours if not set
  IF merchant_open_time IS NULL THEN merchant_open_time := '09:00'::TIME; END IF;
  IF merchant_close_time IS NULL THEN merchant_close_time := '18:00'::TIME; END IF;

  RAISE LOG 'SLOT_AUDIT: Merchant hours: % to %', merchant_open_time, merchant_close_time;

  -- Check if it's a shop holiday
  IF EXISTS (
    SELECT 1 FROM public.shop_holidays sh
    WHERE sh.merchant_id = p_merchant_id AND sh.holiday_date = p_date
  ) THEN
    RAISE LOG 'SLOT_AUDIT: Shop holiday on date: %', p_date;
    RETURN; -- No slots available on shop holidays
  END IF;

  -- Generate slots for each staff member
  FOR staff_record IN 
    SELECT s.id, s.name FROM public.staff s 
    WHERE s.merchant_id = p_merchant_id 
    AND (p_staff_id IS NULL OR s.id = p_staff_id)
    ORDER BY s.name
  LOOP
    -- Check if staff has full day holiday
    IF EXISTS (
      SELECT 1 FROM public.stylist_holidays sh
      WHERE sh.staff_id = staff_record.id AND sh.holiday_date = p_date
    ) THEN
      RAISE LOG 'SLOT_AUDIT: Staff % has holiday on %', staff_record.name, p_date;
      CONTINUE; -- Skip this staff member
    END IF;

    -- CRITICAL: Set actual start time based on whether it's today or future date
    IF is_today THEN
      actual_start_time := GREATEST(merchant_open_time, buffer_time);
      -- If buffer time is past closing time, no slots available for this staff
      IF buffer_time >= merchant_close_time THEN
        RAISE LOG 'SLOT_AUDIT: Buffer time % >= closing time % - no slots for staff %', 
          buffer_time, merchant_close_time, staff_record.name;
        CONTINUE;
      END IF;
    ELSE
      actual_start_time := merchant_open_time;
    END IF;
    
    -- Initialize slot time to actual start time (CRITICAL)
    slot_time := actual_start_time;
    RAISE LOG 'SLOT_AUDIT: Starting slot generation from: % for staff: % (is_today: %)', 
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

      -- Log first slot for audit
      IF slot_time = actual_start_time THEN
        RAISE LOG 'SLOT_AUDIT: First slot for staff %: % (available: %)', staff_record.name, slot_time, NOT has_conflict;
      END IF;

      -- Return the slot
      RETURN QUERY SELECT 
        staff_record.id,
        staff_record.name,
        slot_time,
        NOT has_conflict,
        conflict_message;

      -- Increment by 10 minutes (CRITICAL)
      slot_time := slot_time + INTERVAL '10 minutes';
    END LOOP;
    
    -- Log completion for audit
    RAISE LOG 'SLOT_AUDIT: Completed slots for staff %', staff_record.name;
  END LOOP;
  
  RAISE LOG 'SLOT_AUDIT: Function completed for date: %', p_date;
END;
$$;
