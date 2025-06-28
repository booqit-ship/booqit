
-- Make email field nullable in profiles table to support phone-only users
ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;

-- Add index on phone field for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);

-- Add constraint to ensure at least email or phone is present
ALTER TABLE profiles ADD CONSTRAINT check_email_or_phone 
CHECK (email IS NOT NULL OR phone IS NOT NULL);
