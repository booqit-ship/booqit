
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, X, Loader2, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Staff {
  id: string;
  name: string;
  merchant_id: string;
}

interface AddStaffWidgetProps {
  merchantId: string;
  onStaffAdded: (staff: Staff) => void;
  isOpen: boolean;
  onClose: () => void;
}

const AddStaffWidget: React.FC<AddStaffWidgetProps> = ({
  merchantId,
  onStaffAdded,
  isOpen,
  onClose
}) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const resetForm = () => {
    setName('');
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
        .from('staff')
        .insert({
          merchant_id: merchantId,
          name: name.trim()
        })
        .select();

      if (error) throw error;

      const newStaff = data[0] as Staff;
      onStaffAdded(newStaff);
      
      toast({
        title: "Success",
        description: "Staff member added successfully."
      });

      resetForm();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add staff member. Please try again."
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
            <Users className="h-5 w-5 text-booqit-primary" />
            Add New Staff Member
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
            <p className="text-sm text-gray-600 mb-4">
              Add, edit, or remove staff members for your shop.
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="staffName" className="text-sm font-medium">Staff Name</Label>
                <Input
                  id="staffName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Enter staff name"
                  className="border-booqit-primary/20 focus:border-booqit-primary"
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
                  disabled={isSubmitting || !name.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Staff
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

export default AddStaffWidget;
