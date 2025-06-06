
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { Service } from '@/types';
import { PlusCircle, X, Loader2, DollarSign, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface AddServiceWidgetProps {
  merchantId: string;
  onServiceAdded: (service: Service) => void;
  isOpen: boolean;
  onClose: () => void;
}

const AddServiceWidget: React.FC<AddServiceWidgetProps> = ({
  merchantId,
  onServiceAdded,
  isOpen,
  onClose
}) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const resetForm = () => {
    setName('');
    setPrice('');
    setDuration('');
    setDescription('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchantId) {
      toast({
        title: "Error",
        description: "Merchant information not found. Please complete onboarding first."
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('services')
        .insert({
          merchant_id: merchantId,
          name,
          price: parseFloat(price),
          duration: parseInt(duration),
          description
        })
        .select();

      if (error) throw error;

      const newService = data[0] as Service;
      onServiceAdded(newService);
      
      toast({
        title: "Success",
        description: "Service created successfully."
      });

      resetForm();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create service. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-w-[95vw] mx-auto">
        <DialogHeader className="relative">
          <DialogTitle className="text-xl font-light text-booqit-dark flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-booqit-primary" />
            Add New Service
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
                <Label htmlFor="name" className="text-sm font-medium">Service Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Haircut, Massage, Consultation"
                  className="border-booqit-primary/20 focus:border-booqit-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-sm font-medium flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Price (₹)
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    placeholder="499"
                    className="border-booqit-primary/20 focus:border-booqit-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-sm font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Duration (mins)
                  </Label>
                  <Input
                    id="duration"
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
                <Label htmlFor="description" className="text-sm font-medium">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe your service in detail..."
                  className="border-booqit-primary/20 focus:border-booqit-primary resize-none"
                />
              </div>

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
                      Adding...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Service
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

export default AddServiceWidget;
