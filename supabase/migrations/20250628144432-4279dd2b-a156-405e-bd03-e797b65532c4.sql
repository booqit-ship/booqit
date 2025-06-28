
-- Drop all existing conflicting policies for user_avatars bucket
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to user_avatars bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars in user_avatars bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars in user_avatars bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view user avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for avatars" ON storage.objects;

-- Ensure the bucket exists with correct configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user_avatars',
  'user_avatars', 
  true, -- Public bucket for easy access
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Create the most permissive policies possible for user_avatars bucket
CREATE POLICY "user_avatars_insert_policy" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'user_avatars' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "user_avatars_select_policy" ON storage.objects
FOR SELECT USING (bucket_id = 'user_avatars');

CREATE POLICY "user_avatars_update_policy" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'user_avatars' AND
  auth.role() = 'authenticated'
) WITH CHECK (
  bucket_id = 'user_avatars' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "user_avatars_delete_policy" ON storage.objects
FOR DELETE USING (
  bucket_id = 'user_avatars' AND
  auth.role() = 'authenticated'
);

-- Grant necessary permissions to ensure authenticated users can access storage
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;
