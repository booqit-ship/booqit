
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
AS $function$
DECLARE
  current_time_threshold TIME;
  current_date_check DATE;
  buffer_minutes INTEGER := 60; -- 1 hour buffer for today
  appointment_buffer INTEGER := 10; -- 10 minutes between appointments
  merchant_open_time TIME;
  merchant_close_time TIME;
  slot_time TIME;
  slot_interval INTERVAL := '10 minutes';
  staff_record RECORD;
  service_end_time TIME;
  service_slots_needed INTEGER;
  has_conflict BOOLEAN;
  conflict_message TEXT;
  check_time TIME;
  i INTEGER;
BEGIN
  current_date_check := CURRENT_DATE;
  
  -- Calculate how many 10-minute slots needed for service + buffer
  service_slots_needed := CEIL((p_service_duration + appointment_buffer)::FLOAT / 10);
  
  -- Set time threshold based on date
  IF p_date = current_date_check THEN
    -- For today: only show slots 1 hour from now
    current_time_threshold := (CURRENT_TIME + (buffer_minutes || ' minutes')::INTERVAL)::TIME;
  ELSE
    -- For future dates: show from opening time
    current_time_threshold := '00:00:00'::TIME;
  END IF;

  -- Get merchant operating hours
  SELECT open_time, close_time INTO merchant_open_time, merchant_close_time
  FROM public.merchants 
  WHERE id = p_merchant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Merchant not found';
  END IF;

  -- Check if it's a shop holiday
  IF EXISTS (
    SELECT 1 FROM public.shop_holidays 
    WHERE merchant_id = p_merchant_id AND holiday_date = p_date
  ) THEN
    RETURN;
  END IF;

  -- Loop through staff members
  FOR staff_record IN 
    SELECT s.id, s.name FROM public.staff s 
    WHERE s.merchant_id = p_merchant_id 
    AND (p_staff_id IS NULL OR s.id = p_staff_id)
  LOOP
    -- Check if staff has full day holiday
    IF EXISTS (
      SELECT 1 FROM public.stylist_holidays 
      WHERE stylist_holidays.staff_id = staff_record.id AND holiday_date = p_date
    ) THEN
      CONTINUE;
    END IF;

    -- Generate time slots for this staff member
    slot_time := GREATEST(merchant_open_time, current_time_threshold);
    
    WHILE slot_time + (p_service_duration || ' minutes')::INTERVAL <= merchant_close_time LOOP
      service_end_time := slot_time + (p_service_duration || ' minutes')::INTERVAL;
      has_conflict := FALSE;
      conflict_message := NULL;

      -- Check if all required consecutive slots are available
      check_time := slot_time;
      FOR i IN 1..service_slots_needed LOOP
        -- Check if this specific slot is booked
        IF EXISTS (
          SELECT 1 FROM public.stylist_time_slots sts
          WHERE sts.staff_id = staff_record.id 
          AND sts.date = p_date
          AND sts.time_slot = check_time
          AND (sts.is_available = false OR sts.booking_id IS NOT NULL)
        ) THEN
          has_conflict := TRUE;
          conflict_message := 'This time slot is already booked by another customer.';
          EXIT;
        END IF;
        
        check_time := check_time + slot_interval;
      END LOOP;

      -- Check if service duration overlaps with any blocked ranges
      IF NOT has_conflict AND EXISTS (
        SELECT 1 FROM public.stylist_blocked_slots sbs
        WHERE sbs.staff_id = staff_record.id 
        AND sbs.blocked_date = p_date
        AND sbs.start_time IS NOT NULL 
        AND sbs.end_time IS NOT NULL
        AND (
          (slot_time >= sbs.start_time AND slot_time < sbs.end_time) OR
          (service_end_time > sbs.start_time AND service_end_time <= sbs.end_time) OR
          (slot_time <= sbs.start_time AND service_end_time >= sbs.end_time)
        )
      ) THEN
        has_conflict := TRUE;
        SELECT CONCAT('Stylist is not available from ', 
                     TO_CHAR(sbs.start_time, 'HH12:MI AM'), 
                     ' to ', 
                     TO_CHAR(sbs.end_time, 'HH12:MI AM'), 
                     '. Please choose different timing or another stylist.')
        INTO conflict_message
        FROM public.stylist_blocked_slots sbs
        WHERE sbs.staff_id = staff_record.id 
        AND sbs.blocked_date = p_date
        AND sbs.start_time IS NOT NULL 
        AND sbs.end_time IS NOT NULL
        AND (
          (slot_time >= sbs.start_time AND slot_time < sbs.end_time) OR
          (service_end_time > sbs.start_time AND service_end_time <= sbs.end_time) OR
          (slot_time <= sbs.start_time AND service_end_time >= sbs.end_time)
        )
        LIMIT 1;
      END IF;

      -- Return the slot with availability status
      RETURN QUERY SELECT 
        staff_record.id,
        staff_record.name,
        slot_time,
        NOT has_conflict,
        conflict_message;

      -- Move to next potential slot time
      slot_time := slot_time + slot_interval;
    END LOOP;
  END LOOP;
END;
$function$;
