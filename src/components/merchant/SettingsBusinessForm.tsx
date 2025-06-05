import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Camera, Upload, AlertCircle } from 'lucide-react';
import { Merchant } from '@/types';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  genderFocus: string;
  setGenderFocus: React.Dispatch<React.SetStateAction<string>>;
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

// Gender focus options
const genderOptions = [{
  id: 'male',
  label: 'Male'
}, {
  id: 'female',
  label: 'Female'
}, {
  id: 'unisex',
  label: 'Unisex'
}];
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
  genderFocus,
  setGenderFocus,
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
  const [imageError, setImageError] = useState<string | null>(null);
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setImageError("Image size should be less than 5MB");
        return;
      }

      // Only accept image files
      if (!file.type.startsWith('image/')) {
        setImageError("Please select an image file");
        return;
      }
      setShopImage(file);
    }
  };
  return <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-light">Business Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSave} className="space-y-6">
          {/* Shop Image */}
          <div className="space-y-2">
            <Label htmlFor="image">Shop Image</Label>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="w-32 h-32 rounded-lg bg-gray-100 overflow-hidden border flex items-center justify-center">
                {shopImageUrl || shopImage ? <img src={shopImage ? URL.createObjectURL(shopImage) : shopImageUrl || ''} alt="Shop preview" className="w-full h-full object-cover" /> : <Camera className="h-10 w-10 text-gray-400" />}
              </div>
              
              <div className="flex flex-col gap-2 w-full max-w-md">
                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" onClick={() => document.getElementById('shop-image-upload')?.click()} className="flex items-center gap-2" disabled={isUploading}>
                    <Upload className="h-4 w-4" />
                    {shopImage ? 'Change Image' : 'Upload Image'}
                  </Button>
                  
                  {shopImage && <Button type="button" variant="ghost" className="text-destructive" onClick={() => setShopImage(null)}>
                      Cancel
                    </Button>}
                </div>
                
                {shopImage && <p className="text-sm text-muted-foreground">{shopImage.name}</p>}
                
                <input type="file" id="shop-image-upload" accept="image/*" onChange={handleImageChange} className="hidden" />
                
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended: Square image, at least 500x500px, maximum size 5MB
                </p>
              </div>
            </div>
            
            {imageError && <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{imageError}</AlertDescription>
              </Alert>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shopName">Shop Name <span className="text-red-500">*</span></Label>
              <Input id="shopName" value={shopName} onChange={e => setShopName(e.target.value)} placeholder="Enter your shop name" required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Business Type <span className="text-red-500">*</span></Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beauty_salon">Beauty Salon</SelectItem>
                  <SelectItem value="barber_shop">Barber Shop</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Service For <span className="text-red-500">*</span></Label>
              <RadioGroup value={genderFocus} onValueChange={setGenderFocus} className="flex flex-wrap gap-4 pt-2">
                {genderOptions.map(option => <div key={option.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.id} id={`gender-${option.id}`} />
                    <Label htmlFor={`gender-${option.id}`} className="cursor-pointer">
                      {option.label}
                    </Label>
                  </div>)}
              </RadioGroup>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Business Description</Label>
              <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your services and specialties" rows={4} />
              <p className="text-xs text-muted-foreground">
                Tell customers what makes your business special
              </p>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Business Address <span className="text-red-500">*</span></Label>
              <Input id="address" value={address} onChange={e => setAddress(e.target.value)} placeholder="Enter your business address" required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="openTime">Opening Time <span className="text-red-500">*</span></Label>
              <Input type="time" id="openTime" value={openTime} onChange={e => setOpenTime(e.target.value)} required />
              <p className="text-xs text-muted-foreground">
                Current: {openTime || 'Not set'}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="closeTime">Closing Time <span className="text-red-500">*</span></Label>
              <Input type="time" id="closeTime" value={closeTime} onChange={e => setCloseTime(e.target.value)} required />
              <p className="text-xs text-muted-foreground">
                Current: {closeTime || 'Not set'}
              </p>
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button type="submit" className="bg-booqit-primary hover:bg-booqit-primary/90" disabled={isSaving || isUploading}>
              {isSaving ? 'Saving...' : isUploading ? 'Uploading...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>;
};
export default SettingsBusinessForm;