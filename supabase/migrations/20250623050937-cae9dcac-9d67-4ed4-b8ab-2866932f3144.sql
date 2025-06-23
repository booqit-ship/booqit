
-- Make user_id nullable in bookings table to support guest bookings
ALTER TABLE public.bookings ALTER COLUMN user_id DROP NOT NULL;

-- Update the existing trigger to handle the nullable user_id properly
-- (The trigger function is already updated to handle this case)
