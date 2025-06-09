
-- Create atomic multi-slot locking function
CREATE OR REPLACE FUNCTION public.create_atomic_multi_slot_lock(
  p_staff_id uuid,
  p_date date,
  p_start_time time without time zone,
  p_service_duration integer,
  p_lock_duration_minutes integer DEFAULT 5
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  lock_expires_at timestamp with time zone;
  slots_needed integer;
  current_slot_time time;
  slot_count integer := 0;
  conflicting_slot time;
  i integer;
BEGIN
  lock_expires_at := now() + (p_lock_duration_minutes || ' minutes')::interval;
  
  -- Calculate how many 10-minute slots we need
  slots_needed := CEIL(p_service_duration::FLOAT / 10);
  
  RAISE LOG 'ATOMIC_LOCK: Attempting to lock % slots starting at % for staff %', 
    slots_needed, p_start_time, p_staff_id;
  
  -- Start a transaction to check and lock all slots atomically
  BEGIN
    current_slot_time := p_start_time;
    
    -- First pass: Check if ALL required slots are available
    FOR i IN 1..slots_needed LOOP
      -- Check if this specific slot is already locked and not expired
      IF EXISTS (
        SELECT 1 FROM public.slot_locks
        WHERE staff_id = p_staff_id
          AND date = p_date
          AND time_slot = current_slot_time
          AND expires_at > now()
      ) THEN
        RAISE LOG 'ATOMIC_LOCK: Slot % already locked', current_slot_time;
        RETURN json_build_object(
          'success', false,
          'error', 'One or more slots are already locked',
          'conflicting_slot', current_slot_time::text
        );
      END IF;
      
      -- Check if this slot is already booked
      IF EXISTS (
        SELECT 1 FROM public.bookings b
        JOIN public.services s ON b.service_id = s.id
        WHERE b.staff_id = p_staff_id
          AND b.date = p_date
          AND b.status IN ('pending', 'confirmed', 'completed')
          AND NOT (
            -- No overlap: new slot ends before booking starts OR new slot starts after booking ends
            (current_slot_time + interval '10 minutes') <= b.time_slot::time OR 
            current_slot_time >= (b.time_slot::time + (s.duration || ' minutes')::interval)
          )
      ) THEN
        RAISE LOG 'ATOMIC_LOCK: Slot % already booked', current_slot_time;
        RETURN json_build_object(
          'success', false,
          'error', 'One or more slots are already booked',
          'conflicting_slot', current_slot_time::text
        );
      END IF;
      
      current_slot_time := current_slot_time + interval '10 minutes';
    END LOOP;
    
    -- Second pass: If all slots are available, lock them ALL
    current_slot_time := p_start_time;
    FOR i IN 1..slots_needed LOOP
      INSERT INTO public.slot_locks (staff_id, date, time_slot, expires_at)
      VALUES (p_staff_id, p_date, current_slot_time, lock_expires_at)
      ON CONFLICT (staff_id, date, time_slot)
      DO UPDATE SET
        expires_at = lock_expires_at,
        created_at = now();
      
      slot_count := slot_count + 1;
      current_slot_time := current_slot_time + interval '10 minutes';
    END LOOP;
    
    RAISE LOG 'ATOMIC_LOCK: Successfully locked % slots', slot_count;
    
    RETURN json_build_object(
      'success', true,
      'message', 'All slots locked successfully',
      'slots_locked', slot_count,
      'expires_at', lock_expires_at
    );
    
  EXCEPTION WHEN OTHERS THEN
    -- If anything goes wrong, the transaction will rollback automatically
    RAISE LOG 'ATOMIC_LOCK: Error occurred: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to lock slots: ' || SQLERRM
    );
  END;
END;
$function$;

-- Create function to release all slots for a booking atomically
CREATE OR REPLACE FUNCTION public.release_atomic_multi_slot_lock(
  p_staff_id uuid,
  p_date date,
  p_start_time time without time zone,
  p_service_duration integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  slots_needed integer;
  current_slot_time time;
  slots_released integer := 0;
  i integer;
BEGIN
  -- Calculate how many 10-minute slots we need to release
  slots_needed := CEIL(p_service_duration::FLOAT / 10);
  
  current_slot_time := p_start_time;
  
  -- Release all slots for this booking
  FOR i IN 1..slots_needed LOOP
    DELETE FROM public.slot_locks
    WHERE staff_id = p_staff_id
      AND date = p_date
      AND time_slot = current_slot_time;
    
    IF FOUND THEN
      slots_released := slots_released + 1;
    END IF;
    
    current_slot_time := current_slot_time + interval '10 minutes';
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'slots_released', slots_released
  );
END;
$function$;
