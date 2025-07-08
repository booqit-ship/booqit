
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Service } from '@/types';
import { Edit, X, Loader2, DollarSign, Clock, Tag, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface EditServiceWidgetProps {
  service: Service;
  onServiceUpdated: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const EditServiceWidget: React.FC<EditServiceWidgetProps> = ({
  service,
  onServiceUpdated,
  isOpen,
  onClose
}) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('unisex');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchantGenderFocus, setMerchantGenderFocus] = useState<string>('unisex');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (service && isOpen) {
      setName(service.name);
      setPrice(service.price.toString());
      setDuration(service.duration.toString());
      setDescription(service.description || '');
      setType(service.type || 'unisex');
      
      // Handle categories - check if it's an array
      if (Array.isArray(service.categories)) {
        setSelectedCategories(service.categories);
      } else {
        setSelectedCategories([]);
      }
      
      fetchCategories();
      fetchMerchantInfo();
    }
  }, [service, isOpen]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .eq('merchant_id', service.merchant_id)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchMerchantInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('gender_focus')
        .eq('id', service.merchant_id)
        .single();

      if (error) throw error;
      setMerchantGenderFocus(data?.gender_focus || 'unisex');
    } catch (error) {
      console.error('Error fetching merchant info:', error);
    }
  };

  const resetForm = () => {
    setName('');
    setPrice('');
    setDuration('');
    setDescription('');
    setType('unisex');
    setSelectedCategories([]);
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('services')
        .update({
          name,
          price: parseFloat(price),
          duration: parseInt(duration),
          description,
          type,
          categories: selectedCategories
        })
        .eq('id', service.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Service updated successfully."
      });

      onServiceUpdated();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update service. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isUnisexShop = merchantGenderFocus === 'unisex';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-w-[95vw] mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader className="relative">
          <DialogTitle className="text-xl font-light text-booqit-dark flex items-center gap-2">
            <Edit className="h-5 w-5 text-booqit-primary" />
            Edit Service
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-6 w-6"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <Card className="border-0 shadow-none">
          <CardContent className="p-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-sm font-medium">Service Name</Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Haircut, Massage, Consultation"
                  className="border-booqit-primary/20 focus:border-booqit-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-price" className="text-sm font-medium flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Price (₹)
                  </Label>
                  <Input
                    id="edit-price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    placeholder="499"
                    className="border-booqit-primary/20 focus:border-booqit-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-duration" className="text-sm font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Duration (mins)
                  </Label>
                  <Input
                    id="edit-duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    required
                    placeholder="30"
                    className="border-booqit-primary/20 focus:border-booqit-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description" className="text-sm font-medium">Description (Optional)</Label>
                <Textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe your service in detail..."
                  className="border-booqit-primary/20 focus:border-booqit-primary resize-none"
                />
              </div>

              {/* Gender Type Selection - Only for Unisex Shops */}
              {isUnisexShop && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Gender Type (Optional)
                  </Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="border-booqit-primary/20 focus:border-booqit-primary">
                      <SelectValue placeholder="Select gender type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unisex">Unisex</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Categories Selection */}
              {categories.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    Categories (Optional)
                  </Label>
                  <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
                    {categories.map((category) => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-${category.id}`}
                          checked={selectedCategories.includes(category.id)}
                          onCheckedChange={() => handleCategoryToggle(category.id)}
                        />
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <label
                            htmlFor={`edit-${category.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {category.name}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1 border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-booqit-primary hover:bg-booqit-primary/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Edit className="mr-2 h-4 w-4" />
                      Update Service
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default EditServiceWidget;
