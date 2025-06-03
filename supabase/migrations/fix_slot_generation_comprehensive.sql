
-- Fix comprehensive slot generation with proper IST handling
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
  
  RAISE LOG 'Generating slots for merchant % on date %, current IST time: %', p_merchant_id, p_date, current_time_ist;
  
  -- Check if the requested date is today
  is_today := p_date = current_date_ist;
  
  -- Get merchant operating hours
  SELECT m.open_time, m.close_time INTO merchant_open_time, merchant_close_time
  FROM public.merchants m
  WHERE m.id = p_merchant_id;

  IF NOT FOUND THEN
    RAISE LOG 'Merchant not found: %', p_merchant_id;
    -- Set default hours if merchant not found
    merchant_open_time := '09:00'::TIME;
    merchant_close_time := '21:00'::TIME;
  END IF;

  IF merchant_open_time IS NULL OR merchant_close_time IS NULL THEN
    RAISE LOG 'Merchant operating hours not set, using defaults';
    merchant_open_time := '09:00'::TIME;
    merchant_close_time := '21:00'::TIME;
  END IF;

  RAISE LOG 'Merchant hours: % to %', merchant_open_time, merchant_close_time;

  -- Check if it's a shop holiday
  SELECT EXISTS (
    SELECT 1 FROM public.shop_holidays sh
    WHERE sh.merchant_id = p_merchant_id AND sh.holiday_date = p_date
  ) INTO is_shop_holiday;

  IF is_shop_holiday THEN
    RAISE LOG 'Shop holiday on date: %', p_date;
    RETURN;
  END IF;

  -- Calculate buffer time for today (current time + 30 minutes)
  IF is_today THEN
    buffer_time := current_time_ist + INTERVAL '30 minutes';
    RAISE LOG 'Today: current time %, buffer time: %', current_time_ist, buffer_time;
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
      SELECT 1 FROM public.stylist_holidays sh
      WHERE sh.staff_id = staff_record.id AND sh.holiday_date = p_date
    ) INTO is_stylist_holiday;

    IF is_stylist_holiday THEN
      RAISE LOG 'Staff % has holiday on %', staff_record.name, p_date;
      CONTINUE;
    END IF;

    -- Start generating slots from either merchant open time or buffer time (whichever is later)
    slot_time := GREATEST(merchant_open_time, buffer_time);
    
    WHILE slot_time < merchant_close_time LOOP
      -- Reset flags for each slot
      is_slot_booked := FALSE;
      is_time_blocked := FALSE;
      slot_status_val := 'Available';
      status_reason_val := NULL;

      -- Check if slot overlaps with any confirmed booking
      SELECT EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.staff_id = staff_record.id 
        AND b.date = p_date
        AND b.time_slot = slot_time::text
        AND b.status IN ('confirmed', 'pending')
      ) INTO is_slot_booked;

      IF is_slot_booked THEN
        slot_status_val := 'Booked';
        status_reason_val := 'Already booked';
      ELSE
        -- Check if slot is in blocked time range
        SELECT EXISTS (
          SELECT 1 FROM public.stylist_blocked_slots sbs
          WHERE sbs.staff_id = staff_record.id 
          AND sbs.blocked_date = p_date
          AND sbs.start_time IS NOT NULL 
          AND sbs.end_time IS NOT NULL
          AND slot_time >= sbs.start_time 
          AND slot_time < sbs.end_time
        ) INTO is_time_blocked;

        IF is_time_blocked THEN
          slot_status_val := 'Blocked';
          SELECT CONCAT('Blocked from ', TO_CHAR(sbs.start_time, 'HH24:MI'), ' to ', TO_CHAR(sbs.end_time, 'HH24:MI'))
          INTO status_reason_val
          FROM public.stylist_blocked_slots sbs
          WHERE sbs.staff_id = staff_record.id 
          AND sbs.blocked_date = p_date
          AND sbs.start_time IS NOT NULL 
          AND sbs.end_time IS NOT NULL
          AND slot_time >= sbs.start_time 
          AND slot_time < sbs.end_time
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

-- Fix the validation function to work with generated slots
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
      -- Check if service duration would overlap with any existing bookings
      SELECT COUNT(*) INTO overlapping_booking_count
      FROM public.bookings b
      JOIN public.services s ON b.service_id = s.id
      WHERE b.staff_id = slot_record.staff_id
      AND b.date = p_date
      AND b.status IN ('confirmed', 'pending')
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

-- Function to ensure merchant has default hours
CREATE OR REPLACE FUNCTION public.ensure_merchant_hours()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.merchants 
  SET 
    open_time = COALESCE(open_time, '09:00'::time),
    close_time = COALESCE(close_time, '21:00'::time)
  WHERE open_time IS NULL OR close_time IS NULL;
END;
$$;

-- Call the function to ensure all merchants have hours
SELECT public.ensure_merchant_hours();
