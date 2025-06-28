
-- Create user_avatars storage bucket for customer profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user_avatars',
  'user_avatars', 
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Create RLS policy for user_avatars bucket - users can upload their own avatars
CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'user_avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create RLS policy for user_avatars bucket - users can view all avatars (public access)
CREATE POLICY "Anyone can view user avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'user_avatars');

-- Create RLS policy for user_avatars bucket - users can update their own avatars
CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'user_avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
) WITH CHECK (
  bucket_id = 'user_avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create RLS policy for user_avatars bucket - users can delete their own avatars
CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'user_avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
