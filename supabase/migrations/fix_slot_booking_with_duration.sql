
-- Function to handle booking with proper slot duration blocking
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
  slot_check_time time;
  i integer;
  existing_booking_count integer;
  result json;
BEGIN
  -- Calculate how many 10-minute slots are needed (round up)
  slots_needed := CEIL(p_service_duration::decimal / 10);
  
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
  
  -- Create time slot entries for all required slots
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
    SELECT 
      p_staff_id,
      s.merchant_id,
      p_date,
      current_slot_time,
      false,
      p_booking_id
    FROM public.staff s
    WHERE s.id = p_staff_id
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

-- Function to properly cancel booking and release all related slots
CREATE OR REPLACE FUNCTION public.cancel_booking_and_release_all_slots(
  p_booking_id uuid,
  p_user_id uuid DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  booking_record record;
  slots_released integer := 0;
BEGIN
  -- Get booking details
  SELECT * INTO booking_record
  FROM public.bookings
  WHERE id = p_booking_id
    AND (p_user_id IS NULL OR user_id = p_user_id);
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking not found or unauthorized'
    );
  END IF;
  
  -- Can't cancel completed bookings
  IF booking_record.status = 'completed' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot cancel completed booking'
    );
  END IF;
  
  -- Release all slots associated with this booking
  UPDATE public.stylist_time_slots
  SET is_available = true,
      booking_id = NULL,
      updated_at = now()
  WHERE booking_id = p_booking_id;
  
  GET DIAGNOSTICS slots_released = ROW_COUNT;
  
  -- Update booking status to cancelled
  UPDATE public.bookings
  SET status = 'cancelled',
      updated_at = now()
  WHERE id = p_booking_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Booking cancelled successfully',
    'slots_released', slots_released
  );
END;
$$;

-- Trigger to automatically handle slot booking when a booking is created
CREATE OR REPLACE FUNCTION public.handle_booking_slot_allocation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  service_duration integer;
  booking_result json;
BEGIN
  -- Only process confirmed or pending bookings
  IF NEW.status NOT IN ('confirmed', 'pending') THEN
    RETURN NEW;
  END IF;
  
  -- Get service duration
  SELECT duration INTO service_duration
  FROM public.services
  WHERE id = NEW.service_id;
  
  -- Default to 30 minutes if no duration found
  service_duration := COALESCE(service_duration, 30);
  
  -- Book the slots
  SELECT public.book_appointment_with_duration_blocking(
    NEW.id,
    NEW.staff_id,
    NEW.date,
    NEW.time_slot::time,
    service_duration
  ) INTO booking_result;
  
  -- Check if booking was successful
  IF NOT (booking_result->>'success')::boolean THEN
    RAISE EXCEPTION 'Slot booking failed: %', booking_result->>'error';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new bookings
DROP TRIGGER IF EXISTS trigger_allocate_booking_slots ON public.bookings;
CREATE TRIGGER trigger_allocate_booking_slots
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_booking_slot_allocation();
