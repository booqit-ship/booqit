
-- Drop all existing policies for user_avatars bucket to start fresh
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to user_avatars bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars in user_avatars bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars in user_avatars bucket" ON storage.objects;

-- Create comprehensive and permissive policies for user_avatars bucket
CREATE POLICY "Allow authenticated users to upload avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'user_avatars' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Allow authenticated users to update avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'user_avatars' AND
  auth.uid() IS NOT NULL
) WITH CHECK (
  bucket_id = 'user_avatars' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Allow authenticated users to delete avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'user_avatars' AND
  auth.uid() IS NOT NULL
);

-- Ensure public read access for avatar display
CREATE POLICY "Allow public read access to avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'user_avatars');

-- Make sure the bucket exists and is properly configured
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user_avatars',
  'user_avatars', 
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
