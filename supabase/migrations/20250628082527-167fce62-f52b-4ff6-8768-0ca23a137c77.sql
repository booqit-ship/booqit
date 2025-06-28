
-- First, let's check for and clean up duplicate profiles
-- This will help us understand the current state of the profiles table

-- 1. Find duplicate profiles by phone number
SELECT phone, COUNT(*) as count, 
       array_agg(id) as profile_ids, 
       array_agg(name) as names
FROM profiles 
WHERE phone IS NOT NULL 
GROUP BY phone 
HAVING COUNT(*) > 1;

-- 2. Update profiles that have default "Customer" name but should have real names
-- This will be handled by the firebase-auth function update

-- 3. Add avatar_url column if it doesn't exist (for profile image upload)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 4. Create index on firebase_uid if the column exists (for better performance)
CREATE INDEX IF NOT EXISTS idx_profiles_firebase_uid ON profiles(firebase_uid) WHERE firebase_uid IS NOT NULL;

-- 5. Function to merge duplicate profiles (keeping the one with the most complete data)
CREATE OR REPLACE FUNCTION merge_duplicate_profiles()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  duplicate_record RECORD;
  primary_profile_id UUID;
  secondary_profile_ids UUID[];
  merged_count INTEGER := 0;
BEGIN
  -- Find duplicates by phone number
  FOR duplicate_record IN 
    SELECT phone, array_agg(id ORDER BY 
      CASE 
        WHEN name IS NOT NULL AND name != 'Customer' THEN 1
        WHEN name = 'Customer' THEN 2
        ELSE 3
      END,
      created_at DESC
    ) as profile_ids
    FROM profiles 
    WHERE phone IS NOT NULL 
    GROUP BY phone 
    HAVING COUNT(*) > 1
  LOOP
    -- Take the first ID as primary (most complete profile)
    primary_profile_id := duplicate_record.profile_ids[1];
    secondary_profile_ids := duplicate_record.profile_ids[2:];
    
    -- Update any bookings that reference secondary profiles
    UPDATE bookings 
    SET user_id = primary_profile_id
    WHERE user_id = ANY(secondary_profile_ids);
    
    -- Update any reviews that reference secondary profiles  
    UPDATE reviews
    SET user_id = primary_profile_id
    WHERE user_id = ANY(secondary_profile_ids);
    
    -- Delete secondary profiles
    DELETE FROM profiles WHERE id = ANY(secondary_profile_ids);
    
    merged_count := merged_count + array_length(secondary_profile_ids, 1);
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'merged_count', merged_count,
    'message', 'Duplicate profiles merged successfully'
  );
END;
$$;

-- Run the merge function
SELECT merge_duplicate_profiles();
