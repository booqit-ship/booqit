
-- Ensure stylist_time_slots table exists for slot management
CREATE TABLE IF NOT EXISTS public.stylist_time_slots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id uuid NOT NULL,
  merchant_id uuid NOT NULL,
  date date NOT NULL,
  time_slot time without time zone NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  booking_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(staff_id, date, time_slot)
);

-- Enable RLS on stylist_time_slots
ALTER TABLE public.stylist_time_slots ENABLE ROW LEVEL SECURITY;

-- Create policy for stylist_time_slots
CREATE POLICY "Allow all operations on stylist_time_slots" ON public.stylist_time_slots FOR ALL USING (true);

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'stylist_time_slots_staff_id_fkey'
  ) THEN
    ALTER TABLE public.stylist_time_slots 
    ADD CONSTRAINT stylist_time_slots_staff_id_fkey 
    FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'stylist_time_slots_merchant_id_fkey'
  ) THEN
    ALTER TABLE public.stylist_time_slots 
    ADD CONSTRAINT stylist_time_slots_merchant_id_fkey 
    FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'stylist_time_slots_booking_id_fkey'
  ) THEN
    ALTER TABLE public.stylist_time_slots 
    ADD CONSTRAINT stylist_time_slots_booking_id_fkey 
    FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;
  END IF;
END $$;
