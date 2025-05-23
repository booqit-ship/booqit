
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from '@/components/ui/button';

interface ShopInfoFormProps {
  shopInfo: {
    name: string;
    category: string;
    gender_focus: string;
    description: string;
    open_time: string;
    close_time: string;
    image: File | null;
  };
  setShopInfo: React.Dispatch<React.SetStateAction<{
    name: string;
    category: string;
    gender_focus: string;
    description: string;
    open_time: string;
    close_time: string;
    image: File | null;
  }>>;
}

// Simplified shop categories
const categories = [
  { id: 'beauty_salon', name: 'Beauty Salon' },
  { id: 'barber_shop', name: 'Barber Shop' }
];

// Gender focus options
const genderOptions = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'unisex', label: 'Unisex' }
];

const ShopInfoForm: React.FC<ShopInfoFormProps> = ({ 
  shopInfo,
  setShopInfo 
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setShopInfo(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCategoryChange = (value: string) => {
    setShopInfo(prev => ({ ...prev, category: value }));
  };

  const handleGenderFocusChange = (value: string) => {
    setShopInfo(prev => ({ ...prev, gender_focus: value }));
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setShopInfo(prev => ({ ...prev, image: e.target.files![0] }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Shop Name</Label>
        <Input
          id="name"
          name="name"
          placeholder="Enter your shop name"
          value={shopInfo.name}
          onChange={handleChange}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Shop Type</Label>
        <Select 
          value={shopInfo.category} 
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger id="category">
            <SelectValue placeholder="Select shop type" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {categories.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Service For</Label>
        <RadioGroup 
          value={shopInfo.gender_focus} 
          onValueChange={handleGenderFocusChange}
          className="flex flex-wrap gap-4 pt-2"
        >
          {genderOptions.map(option => (
            <div key={option.id} className="flex items-center space-x-2">
              <RadioGroupItem value={option.id} id={`gender-${option.id}`} />
              <Label htmlFor={`gender-${option.id}`} className="cursor-pointer">
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Shop Description</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Describe your services and specialties"
          value={shopInfo.description}
          onChange={handleChange}
          className="min-h-[100px]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="open_time">Opening Time</Label>
          <Input
            id="open_time"
            name="open_time"
            type="time"
            value={shopInfo.open_time}
            onChange={handleChange}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="close_time">Closing Time</Label>
          <Input
            id="close_time"
            name="close_time"
            type="time"
            value={shopInfo.close_time}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="shop_image">Shop Cover Image</Label>
        <div className="flex items-center space-x-4">
          <div className="shrink-0 h-20 w-20 rounded bg-gray-100 flex items-center justify-center overflow-hidden border">
            {shopInfo.image ? (
              <img
                src={URL.createObjectURL(shopInfo.image)}
                alt="Shop preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            )}
          </div>
          
          <Button 
            variant="outline" 
            className="relative"
            onClick={() => document.getElementById('shop_image_input')?.click()}
          >
            Upload Image
            <input 
              id="shop_image_input"
              type="file" 
              onChange={handleImageChange}
              accept="image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShopInfoForm;
