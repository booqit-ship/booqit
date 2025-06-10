
-- Create the missing slot_locks table
CREATE TABLE IF NOT EXISTS public.slot_locks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id uuid NOT NULL,
  date date NOT NULL,
  time_slot time without time zone NOT NULL,
  locked_by uuid,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(staff_id, date, time_slot)
);

-- Enable RLS on slot_locks
ALTER TABLE public.slot_locks ENABLE ROW LEVEL SECURITY;

-- Create policy for slot locks
CREATE POLICY "Allow all operations on slot_locks" ON public.slot_locks FOR ALL USING (true);

-- Function to create a slot lock
CREATE OR REPLACE FUNCTION public.create_slot_lock(
  p_staff_id uuid,
  p_date date,
  p_time_slot time without time zone,
  p_lock_duration_minutes integer DEFAULT 10
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  lock_expires_at timestamp with time zone;
  existing_lock_count integer;
BEGIN
  lock_expires_at := now() + (p_lock_duration_minutes || ' minutes')::interval;
  
  -- Check if slot is already locked and not expired
  SELECT COUNT(*) INTO existing_lock_count
  FROM public.slot_locks
  WHERE staff_id = p_staff_id
    AND date = p_date
    AND time_slot = p_time_slot
    AND expires_at > now();
  
  IF existing_lock_count > 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Slot is already locked by another user'
    );
  END IF;
  
  -- Check if slot is already booked
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE staff_id = p_staff_id
      AND date = p_date
      AND time_slot = p_time_slot::text
      AND status IN ('confirmed', 'pending')
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Slot is already booked'
    );
  END IF;
  
  -- Create or update the lock
  INSERT INTO public.slot_locks (staff_id, date, time_slot, expires_at)
  VALUES (p_staff_id, p_date, p_time_slot, lock_expires_at)
  ON CONFLICT (staff_id, date, time_slot)
  DO UPDATE SET
    expires_at = lock_expires_at,
    created_at = now();
  
  RETURN json_build_object(
    'success', true,
    'expires_at', lock_expires_at
  );
END;
$$;

-- Function to release a slot lock
CREATE OR REPLACE FUNCTION public.release_slot_lock(
  p_staff_id uuid,
  p_date date,
  p_time_slot time without time zone
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.slot_locks
  WHERE staff_id = p_staff_id
    AND date = p_date
    AND time_slot = p_time_slot;
  
  RETURN json_build_object('success', true);
END;
$$;

-- Function to clean up expired locks
CREATE OR REPLACE FUNCTION public.cleanup_expired_locks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.slot_locks WHERE expires_at <= now();
END;
$$;
