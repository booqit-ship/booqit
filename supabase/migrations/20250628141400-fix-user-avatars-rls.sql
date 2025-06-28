
-- Drop existing policies that are too restrictive
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

-- Create more permissive policies for user_avatars bucket
CREATE POLICY "Users can upload to user_avatars bucket" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'user_avatars' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their own avatars in user_avatars bucket" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'user_avatars' AND
  auth.uid() IS NOT NULL
) WITH CHECK (
  bucket_id = 'user_avatars' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their own avatars in user_avatars bucket" ON storage.objects
FOR DELETE USING (
  bucket_id = 'user_avatars' AND
  auth.uid() IS NOT NULL
);
