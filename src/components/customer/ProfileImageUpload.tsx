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

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase storage - Fixed bucket name
      const { error: uploadError } = await supabase.storage
        .from('user_avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Failed to upload image');
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user_avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) {
        console.error('Profile update error:', updateError);
        toast.error('Failed to update profile picture');
        return;
      }

      onImageUpdate(publicUrl);
      toast.success('Profile picture updated successfully');
      setShowUploadOptions(false);

    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async () => {
    try {
      setUploading(true);

      // Update profile to remove avatar URL
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
      uploadImage(file);
    }
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
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  uploadImage(file);
                }
              }}
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
