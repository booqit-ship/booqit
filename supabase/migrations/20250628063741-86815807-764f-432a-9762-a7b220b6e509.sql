
-- Add firebase_uid column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN firebase_uid TEXT;

-- Create index for faster lookups by Firebase UID
CREATE INDEX idx_profiles_firebase_uid ON public.profiles(firebase_uid);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.firebase_uid IS 'Firebase UID for cross-platform authentication';
