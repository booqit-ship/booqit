
-- Create the missing function for booking appointments with duration blocking
CREATE OR REPLACE FUNCTION public.book_appointment_with_duration_blocking(
  p_booking_id uuid,
  p_staff_id uuid,
  p_date date,
  p_time_slot time,
  p_service_duration integer DEFAULT 30
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  slots_needed integer;
  current_slot_time time;
  i integer;
  existing_booking_count integer;
  merchant_id_val uuid;
BEGIN
  -- Calculate how many 10-minute slots are needed (round up)
  slots_needed := CEIL(p_service_duration::decimal / 10);
  
  -- Get merchant_id for this staff member
  SELECT merchant_id INTO merchant_id_val
  FROM public.staff
  WHERE id = p_staff_id;
  
  IF merchant_id_val IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Staff member not found'
    );
  END IF;
  
  -- Check if any of the required slots are already booked
  current_slot_time := p_time_slot;
  FOR i IN 1..slots_needed LOOP
    SELECT COUNT(*) INTO existing_booking_count
    FROM public.bookings
    WHERE staff_id = p_staff_id 
      AND date = p_date
      AND time_slot = current_slot_time::text
      AND status IN ('pending', 'confirmed');
    
    IF existing_booking_count > 0 THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Time slot already booked',
        'conflicting_slot', current_slot_time::text
      );
    END IF;
    
    current_slot_time := current_slot_time + interval '10 minutes';
  END LOOP;
  
  -- Create time slot entries for all required slots to block them
  current_slot_time := p_time_slot;
  FOR i IN 1..slots_needed LOOP
    -- Insert into stylist_time_slots to block the slot
    INSERT INTO public.stylist_time_slots (
      staff_id,
      merchant_id,
      date,
      time_slot,
      is_available,
      booking_id
    )
    VALUES (
      p_staff_id,
      merchant_id_val,
      p_date,
      current_slot_time,
      false,
      p_booking_id
    )
    ON CONFLICT (staff_id, date, time_slot) 
    DO UPDATE SET
      is_available = false,
      booking_id = p_booking_id,
      updated_at = now();
    
    current_slot_time := current_slot_time + interval '10 minutes';
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Appointment booked successfully',
    'slots_blocked', slots_needed
  );
END;
$$;
