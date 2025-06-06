
-- Function to cancel bookings within a specified time range for a specific stylist
CREATE OR REPLACE FUNCTION public.cancel_stylist_bookings_in_time_range(
  p_staff_id uuid,
  p_date date,
  p_start_time time DEFAULT NULL,
  p_end_time time DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cancelled_count INTEGER := 0;
  booking_record RECORD;
  cancellation_result JSON;
BEGIN
  -- If both start_time and end_time are provided, cancel bookings within that time range
  IF p_start_time IS NOT NULL AND p_end_time IS NOT NULL THEN
    FOR booking_record IN
      SELECT id
      FROM public.bookings
      WHERE staff_id = p_staff_id
      AND date = p_date
      AND status IN ('pending', 'confirmed')
      AND time_slot::time >= p_start_time
      AND time_slot::time < p_end_time
    LOOP
      SELECT * FROM public.cancel_booking_properly(booking_record.id, NULL) INTO cancellation_result;
      IF (cancellation_result->>'success')::boolean THEN
        cancelled_count := cancelled_count + 1;
      END IF;
    END LOOP;
    
    RETURN json_build_object(
      'success', true,
      'message', 'Cancelled bookings in time range',
      'cancelled_count', cancelled_count,
      'type', 'time_range'
    );
  
  -- If no time range provided, cancel all bookings for the day
  ELSE
    FOR booking_record IN
      SELECT id
      FROM public.bookings
      WHERE staff_id = p_staff_id
      AND date = p_date
      AND status IN ('pending', 'confirmed')
    LOOP
      SELECT * FROM public.cancel_booking_properly(booking_record.id, NULL) INTO cancellation_result;
      IF (cancellation_result->>'success')::boolean THEN
        cancelled_count := cancelled_count + 1;
      END IF;
    END LOOP;
    
    RETURN json_build_object(
      'success', true,
      'message', 'Cancelled all bookings for the day',
      'cancelled_count', cancelled_count,
      'type', 'full_day'
    );
  END IF;
END;
$$;

-- Function to cancel all bookings for a specific merchant on a holiday date
CREATE OR REPLACE FUNCTION public.cancel_all_merchant_bookings_on_date(
  p_merchant_id uuid,
  p_date date
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cancelled_count INTEGER := 0;
  booking_record RECORD;
  cancellation_result JSON;
BEGIN
  FOR booking_record IN
    SELECT id
    FROM public.bookings
    WHERE merchant_id = p_merchant_id
    AND date = p_date
    AND status IN ('pending', 'confirmed')
  LOOP
    SELECT * FROM public.cancel_booking_properly(booking_record.id, NULL) INTO cancellation_result;
    IF (cancellation_result->>'success')::boolean THEN
      cancelled_count := cancelled_count + 1;
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Cancelled all bookings for the holiday date',
    'cancelled_count', cancelled_count
  );
END;
$$;

-- Enhanced manage_stylist_availability function with auto-cancellation
CREATE OR REPLACE FUNCTION public.manage_stylist_availability(
  p_staff_id uuid,
  p_merchant_id uuid,
  p_date date,
  p_is_full_day boolean,
  p_blocked_slots text[] DEFAULT NULL::text[],
  p_description text DEFAULT NULL::text,
  p_auto_cancel boolean DEFAULT true
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cancellation_result json;
  slots_result json;
BEGIN
  -- If auto_cancel is enabled, cancel affected bookings
  IF p_auto_cancel THEN
    IF p_is_full_day THEN
      -- Cancel all bookings for this stylist on this day
      SELECT * FROM public.cancel_stylist_bookings_in_time_range(
        p_staff_id,
        p_date
      ) INTO cancellation_result;
    ELSIF p_blocked_slots IS NOT NULL AND array_length(p_blocked_slots, 1) > 0 THEN
      -- For each blocked slot, cancel any bookings that fall within it
      -- Note: This is a simplified approach, not handling ranges yet
      FOR i IN 1..array_length(p_blocked_slots, 1) LOOP
        DECLARE
          slot_time time := p_blocked_slots[i]::time;
          slot_end time := slot_time + interval '10 minutes';
        BEGIN
          SELECT * FROM public.cancel_stylist_bookings_in_time_range(
            p_staff_id,
            p_date,
            slot_time,
            slot_end
          ) INTO cancellation_result;
        END;
      END LOOP;
    END IF;
  END IF;

  -- First, clear existing entries for this staff and date
  DELETE FROM public.stylist_holidays 
  WHERE staff_id = p_staff_id AND holiday_date = p_date;
  
  DELETE FROM public.stylist_blocked_slots 
  WHERE staff_id = p_staff_id AND blocked_date = p_date;
  
  IF p_is_full_day THEN
    -- Add full day holiday
    INSERT INTO public.stylist_holidays (
      staff_id, merchant_id, holiday_date, description
    ) VALUES (
      p_staff_id, p_merchant_id, p_date, p_description
    );
    
    -- Remove all existing slots for this staff on this date
    DELETE FROM public.stylist_time_slots 
    WHERE staff_id = p_staff_id AND date = p_date;
    
  ELSIF p_blocked_slots IS NOT NULL AND array_length(p_blocked_slots, 1) > 0 THEN
    -- Add blocked time slots
    INSERT INTO public.stylist_blocked_slots (
      staff_id, merchant_id, blocked_date, time_slot, description
    )
    SELECT 
      p_staff_id, p_merchant_id, p_date, unnest(p_blocked_slots), p_description;
    
    -- Remove the specific blocked slots from available slots
    DELETE FROM public.stylist_time_slots 
    WHERE staff_id = p_staff_id 
      AND date = p_date 
      AND time_slot::text = ANY(p_blocked_slots);
  END IF;
  
  -- Regenerate slots for this date to ensure consistency
  PERFORM public.generate_stylist_slots(p_merchant_id, p_date);
  
  IF p_auto_cancel AND cancellation_result IS NOT NULL THEN
    RETURN json_build_object(
      'success', true, 
      'message', 'Availability updated successfully', 
      'cancellations', cancellation_result
    );
  ELSE
    RETURN json_build_object(
      'success', true, 
      'message', 'Availability updated successfully',
      'auto_cancel', p_auto_cancel
    );
  END IF;
END;
$$;

-- Enhance the manage_stylist_availability_ranges function with auto-cancellation
CREATE OR REPLACE FUNCTION public.manage_stylist_availability_ranges(
  p_staff_id uuid, 
  p_merchant_id uuid, 
  p_date date, 
  p_is_full_day boolean, 
  p_blocked_ranges jsonb DEFAULT NULL::jsonb, 
  p_description text DEFAULT NULL::text,
  p_auto_cancel boolean DEFAULT true
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  range_item jsonb;
  cancellation_result json;
  range_start time;
  range_end time;
BEGIN
  -- Auto-cancel affected bookings if enabled
  IF p_auto_cancel THEN
    IF p_is_full_day THEN
      -- Cancel all bookings for this stylist on this day
      SELECT * FROM public.cancel_stylist_bookings_in_time_range(
        p_staff_id,
        p_date
      ) INTO cancellation_result;
    ELSIF p_blocked_ranges IS NOT NULL THEN
      -- For each blocked range, cancel any bookings that fall within it
      FOR range_item IN SELECT * FROM jsonb_array_elements(p_blocked_ranges) LOOP
        range_start := (range_item->>'start_time')::time;
        range_end := (range_item->>'end_time')::time;
        
        SELECT * FROM public.cancel_stylist_bookings_in_time_range(
          p_staff_id,
          p_date,
          range_start,
          range_end
        ) INTO cancellation_result;
      END LOOP;
    END IF;
  END IF;

  -- First, clear existing entries for this staff and date
  DELETE FROM public.stylist_holidays 
  WHERE staff_id = p_staff_id AND holiday_date = p_date;
  
  DELETE FROM public.stylist_blocked_slots 
  WHERE staff_id = p_staff_id AND blocked_date = p_date;
  
  IF p_is_full_day THEN
    -- Add full day holiday
    INSERT INTO public.stylist_holidays (
      staff_id, merchant_id, holiday_date, description
    ) VALUES (
      p_staff_id, p_merchant_id, p_date, p_description
    );
    
    RETURN json_build_object(
      'success', true, 
      'message', 'Full day holiday saved successfully', 
      'cancellations', COALESCE(cancellation_result, 'none')
    );
  ELSIF p_blocked_ranges IS NOT NULL THEN
    -- Add blocked time ranges
    FOR range_item IN SELECT * FROM jsonb_array_elements(p_blocked_ranges) LOOP
      INSERT INTO public.stylist_blocked_slots (
        staff_id, 
        merchant_id, 
        blocked_date, 
        start_time,
        end_time,
        description
      ) VALUES (
        p_staff_id,
        p_merchant_id,
        p_date,
        (range_item->>'start_time')::time,
        (range_item->>'end_time')::time,
        p_description
      );
    END LOOP;
    
    RETURN json_build_object(
      'success', true, 
      'message', 'Blocked time ranges saved successfully', 
      'cancellations', COALESCE(cancellation_result, 'none')
    );
  ELSE
    RETURN json_build_object('success', true, 'message', 'No changes were made');
  END IF;
END;
$$;

-- Enhanced function for shop holidays with auto-cancellation
CREATE OR REPLACE FUNCTION public.add_shop_holiday_with_auto_cancel(
  p_merchant_id uuid,
  p_date date,
  p_description text DEFAULT NULL,
  p_auto_cancel boolean DEFAULT true
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cancellation_result json;
BEGIN
  -- Check if holiday already exists
  IF EXISTS (
    SELECT 1 FROM public.shop_holidays
    WHERE merchant_id = p_merchant_id AND holiday_date = p_date
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Holiday already exists for this date');
  END IF;

  -- Auto-cancel affected bookings if enabled
  IF p_auto_cancel THEN
    SELECT * FROM public.cancel_all_merchant_bookings_on_date(
      p_merchant_id,
      p_date
    ) INTO cancellation_result;
  END IF;

  -- Add the holiday
  INSERT INTO public.shop_holidays (
    merchant_id, holiday_date, description
  ) VALUES (
    p_merchant_id, p_date, p_description
  );
  
  IF p_auto_cancel AND cancellation_result IS NOT NULL THEN
    RETURN json_build_object(
      'success', true, 
      'message', 'Shop holiday added successfully', 
      'cancellations', cancellation_result
    );
  ELSE
    RETURN json_build_object(
      'success', true, 
      'message', 'Shop holiday added successfully'
    );
  END IF;
END;
$$;
