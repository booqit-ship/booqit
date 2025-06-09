
-- Fix: Use total_duration for slot blocking instead of only the first service duration
-- This ensures all slots for the combined duration of multiple services are properly blocked

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
  
  -- Get the total duration from the booking record (sum of all selected services)
  -- This replaces the old logic that only used the first service duration
  SELECT total_duration INTO service_duration
  FROM public.bookings
  WHERE id = NEW.id;
  
  -- Default to 30 minutes if no total duration found
  service_duration := COALESCE(service_duration, 30);
  
  -- Book the slots using the total duration of all services
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

-- Recreate the trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS trigger_allocate_booking_slots ON public.bookings;
CREATE TRIGGER trigger_allocate_booking_slots
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_booking_slot_allocation();
