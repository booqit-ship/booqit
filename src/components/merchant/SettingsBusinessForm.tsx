
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Upload } from 'lucide-react';
import { Merchant } from '@/types';
import { toast } from 'sonner';

interface SettingsBusinessFormProps {
  merchant: Merchant | null;
  isLoading: boolean;
  isSaving: boolean;
  isUploading: boolean;
  onSave: (e: React.FormEvent) => Promise<void>;
  shopName: string;
  setShopName: React.Dispatch<React.SetStateAction<string>>;
  description: string;
  setDescription: React.Dispatch<React.SetStateAction<string>>;
  category: string;
  setCategory: React.Dispatch<React.SetStateAction<string>>;
  openTime: string;
  setOpenTime: React.Dispatch<React.SetStateAction<string>>;
  closeTime: string;
  setCloseTime: React.Dispatch<React.SetStateAction<string>>;
  address: string;
  setAddress: React.Dispatch<React.SetStateAction<string>>;
  shopImage: File | null;
  setShopImage: React.Dispatch<React.SetStateAction<File | null>>;
  shopImageUrl: string | null;
}

const SettingsBusinessForm: React.FC<SettingsBusinessFormProps> = ({
  merchant,
  isLoading,
  isSaving,
  isUploading,
  onSave,
  shopName,
  setShopName,
  description,
  setDescription,
  category,
  setCategory,
  openTime,
  setOpenTime,
  closeTime,
  setCloseTime,
  address,
  setAddress,
  shopImage,
  setShopImage,
  shopImageUrl
}) => {
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Only accept image files
      if (file.type.startsWith('image/')) {
        setShopImage(file);
      } else {
        toast.error('Please select an image file');
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSave} className="space-y-6">
          {/* Shop Image */}
          <div className="space-y-2">
            <Label htmlFor="image">Shop Image</Label>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="w-32 h-32 rounded-lg bg-gray-100 overflow-hidden border flex items-center justify-center">
                {(shopImageUrl || shopImage) ? (
                  <img 
                    src={shopImage ? URL.createObjectURL(shopImage) : shopImageUrl || ''} 
                    alt="Shop preview" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera className="h-10 w-10 text-gray-400" />
                )}
              </div>
              
              <div className="flex flex-col gap-2 w-full max-w-md">
                <div className="flex items-center gap-2">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => document.getElementById('shop-image-upload')?.click()}
                    className="flex items-center gap-2"
                    disabled={isUploading}
                  >
                    <Upload className="h-4 w-4" />
                    {shopImage ? 'Change Image' : 'Upload Image'}
                  </Button>
                  
                  {shopImage && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      className="text-destructive"
                      onClick={() => setShopImage(null)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
                
                {shopImage && (
                  <p className="text-sm text-muted-foreground">{shopImage.name}</p>
                )}
                
                <input 
                  type="file" 
                  id="shop-image-upload" 
                  accept="image/*" 
                  onChange={handleImageChange} 
                  className="hidden" 
                />
                
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended: Square image, at least 500x500px
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shopName">Shop Name</Label>
              <Input 
                id="shopName"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="Enter your shop name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Business Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Salon">Salon</SelectItem>
                  <SelectItem value="Spa">Spa</SelectItem>
                  <SelectItem value="Barber">Barber</SelectItem>
                  <SelectItem value="Massage">Massage</SelectItem>
                  <SelectItem value="Nail Salon">Nail Salon</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Business Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your services and specialties"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Tell customers what makes your business special
              </p>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Business Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your business address"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="openTime">Opening Time</Label>
              <Input
                type="time"
                id="openTime"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="closeTime">Closing Time</Label>
              <Input
                type="time"
                id="closeTime"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button 
              type="submit" 
              className="bg-booqit-primary"
              disabled={isSaving || isUploading}
            >
              {isSaving ? 'Saving...' : isUploading ? 'Uploading...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default SettingsBusinessForm;
