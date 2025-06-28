
import React, { useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProfileImageUploadProps {
  currentImageUrl?: string | null;
  userName: string;
  userId: string;
  onImageUpdate: (newImageUrl: string | null) => void;
}

const ProfileImageUpload: React.FC<ProfileImageUploadProps> = ({
  currentImageUrl,
  userName,
  userId,
  onImageUpdate
}) => {
  const [uploading, setUploading] = useState(false);
  const [showUploadOptions, setShowUploadOptions] = useState(false);

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .trim()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(x => x[0])
      .join('')
      .toUpperCase();
  };

  const uploadImage = async (file: File) => {
    try {
      setUploading(true);
      
      console.log('=== Starting image upload ===');
      console.log('User ID:', userId);
      console.log('File:', file.name, file.type, file.size);
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      // Check authentication
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session) {
        console.error('Authentication error:', authError);
        toast.error('Please log in again to upload images');
        return;
      }

      console.log('User authenticated:', session.user.id);

      // Create simple filename without folders
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `avatar_${userId}_${Date.now()}.${fileExt}`;
      
      console.log('Generated filename:', fileName);

      // Upload to Supabase storage with detailed logging
      console.log('Uploading to user_avatars bucket...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user_avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error details:', {
          message: uploadError.message,
          error: uploadError,
          cause: uploadError.cause
        });
        
        // Provide specific error messages
        if (uploadError.message.includes('not found')) {
          toast.error('Storage bucket not found. Please contact support.');
        } else if (uploadError.message.includes('policy')) {
          toast.error('Permission denied. Please try logging in again.');
        } else {
          toast.error(`Upload failed: ${uploadError.message}`);
        }
        return;
      }

      console.log('Upload successful:', uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user_avatars')
        .getPublicUrl(fileName);

      console.log('Public URL generated:', publicUrl);

      // Test if the URL is accessible
      try {
        const response = await fetch(publicUrl, { method: 'HEAD' });
        console.log('URL accessibility test:', response.status);
      } catch (e) {
        console.warn('URL test failed:', e);
      }

      // Update user profile with new avatar URL
      console.log('Updating profile with avatar URL...');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) {
        console.error('Profile update error:', updateError);
        toast.error('Failed to update profile picture');
        return;
      }

      console.log('Profile updated successfully');
      onImageUpdate(publicUrl);
      toast.success('Profile picture updated successfully!');
      setShowUploadOptions(false);

    } catch (error) {
      console.error('Unexpected error during upload:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async () => {
    try {
      setUploading(true);

      console.log('Removing profile image...');
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (error) {
        console.error('Profile update error:', error);
        toast.error('Failed to remove profile picture');
        return;
      }

      onImageUpdate(null);
      toast.success('Profile picture removed');
      setShowUploadOptions(false);

    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('File selected:', file.name);
      uploadImage(file);
    }
    // Reset input value to allow selecting the same file again
    event.target.value = '';
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-5 py-4">
        <div className="relative">
          <Avatar className="w-20 h-20 shadow-md flex-shrink-0">
            <AvatarImage src={currentImageUrl ?? ''} />
            <AvatarFallback className="bg-booqit-primary/10 text-booqit-primary text-lg">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
          
          <Button
            onClick={() => setShowUploadOptions(!showUploadOptions)}
            size="sm"
            className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 p-0 bg-booqit-primary hover:bg-booqit-primary/90"
            disabled={uploading}
          >
            <Camera className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-col justify-center min-w-0">
          <span className="font-bold text-lg uppercase text-gray-900 truncate">
            {userName || 'No name set'}
          </span>
          <span className="text-sm text-gray-500">
            Click camera icon to change picture
          </span>
        </div>
      </div>

      {showUploadOptions && (
        <div className="absolute top-full left-0 mt-2 bg-white border rounded-lg shadow-lg p-3 z-10 min-w-[200px]">
          <div className="space-y-2">
            <label htmlFor="avatar-upload">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                disabled={uploading}
                asChild
              >
                <span className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Upload New Photo'}
                </span>
              </Button>
            </label>
            <input
              id="avatar-upload"  
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            
            {currentImageUrl && (
              <Button
                onClick={removeImage}
                variant="outline"
                size="sm"
                className="w-full justify-start text-red-600 hover:text-red-700"
                disabled={uploading}
              >
                <X className="h-4 w-4 mr-2" />
                Remove Photo
              </Button>
            )}
            
            <Button
              onClick={() => setShowUploadOptions(false)}
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileImageUpload;
