
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus, Clock, DollarSign, FileText, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddServiceWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; price: string; duration: string; description: string }) => void;
  isSubmitting?: boolean;
  isEditMode?: boolean;
  initialData?: {
    name: string;
    price: string;
    duration: string;
    description: string;
  };
}

const AddServiceWidget: React.FC<AddServiceWidgetProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  isEditMode = false,
  initialData
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [price, setPrice] = useState(initialData?.price || '');
  const [duration, setDuration] = useState(initialData?.duration || '');
  const [description, setDescription] = useState(initialData?.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, price, duration, description });
  };

  const resetForm = () => {
    setName('');
    setPrice('');
    setDuration('');
    setDescription('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/50 z-50 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={handleClose}
      />
      
      {/* Widget */}
      <div className={cn(
        "fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto transition-all duration-300 ease-out",
        "md:inset-x-auto md:right-8 md:top-1/2 md:-translate-y-1/2 md:left-auto",
        isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"
      )}>
        <Card className="shadow-2xl border-0 overflow-hidden bg-white">
          {/* Header */}
          <CardHeader className="bg-gradient-to-r from-booqit-primary to-booqit-primary/90 text-white relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">
                    {isEditMode ? 'Edit Service' : 'Add New Service'}
                  </CardTitle>
                  <p className="text-white/80 text-sm">
                    {isEditMode ? 'Update service details' : 'Create a new service offering'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="text-white hover:bg-white/20 h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          {/* Content */}
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Service Name */}
              <div className="space-y-2">
                <Label htmlFor="service-name" className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4 text-booqit-primary" />
                  Service Name
                </Label>
                <Input
                  id="service-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Haircut, Massage, Consultation"
                  required
                  className="border-gray-300 focus:border-booqit-primary focus:ring-booqit-primary/20"
                />
              </div>

              {/* Price and Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="service-price" className="flex items-center gap-2 text-sm font-medium">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    Price (₹)
                  </Label>
                  <Input
                    id="service-price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="499"
                    required
                    className="border-gray-300 focus:border-booqit-primary focus:ring-booqit-primary/20"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="service-duration" className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-4 w-4 text-blue-600" />
                    Duration (mins)
                  </Label>
                  <Input
                    id="service-duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="30"
                    required
                    className="border-gray-300 focus:border-booqit-primary focus:ring-booqit-primary/20"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="service-description" className="text-sm font-medium">
                  Description (Optional)
                </Label>
                <Textarea
                  id="service-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your service in detail..."
                  rows={3}
                  className="border-gray-300 focus:border-booqit-primary focus:ring-booqit-primary/20 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 border-gray-300 hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-booqit-primary hover:bg-booqit-primary/90 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {isEditMode ? 'Updating...' : 'Adding...'}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      {isEditMode ? 'Update Service' : 'Add Service'}
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default AddServiceWidget;
