
-- Update the get_fresh_available_slots function to fix slot generation issues
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

      -- Check if slot is booked (confirmed or pending bookings)
      SELECT EXISTS (
        SELECT 1 FROM public.bookings 
        WHERE staff_id = staff_record.id 
        AND date = p_date
        AND time_slot = slot_time::text
        AND status IN ('confirmed', 'pending')
      ) INTO is_slot_booked;

      IF is_slot_booked THEN
        slot_status_val := 'Booked';
        status_reason_val := 'Already booked by another customer';
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
