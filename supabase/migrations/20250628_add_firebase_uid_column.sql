
-- Add firebase_uid column to profiles table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'firebase_uid'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN firebase_uid TEXT;
        
        -- Create index for better performance
        CREATE INDEX IF NOT EXISTS idx_profiles_firebase_uid ON public.profiles(firebase_uid);
        
        -- Add comment for documentation
        COMMENT ON COLUMN public.profiles.firebase_uid IS 'Firebase UID for cross-platform authentication';
    END IF;
END $$;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
