
import React, { useState, useEffect } from 'react';
import { Staff } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, UserPlus, Loader2 } from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StaffSelectorProps {
  merchantId: string;
  serviceId: string | null;
  selectedStaffIds: string[];
  onChange: (staffIds: string[]) => void;
  isRequired?: boolean;
}

const StaffSelector: React.FC<StaffSelectorProps> = ({
  merchantId,
  serviceId,
  selectedStaffIds,
  onChange,
  isRequired = true
}) => {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddStaffDialog, setShowAddStaffDialog] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);
  const { toast } = useToast();

  // Fetch staff members
  useEffect(() => {
    const fetchStaff = async () => {
      if (!merchantId) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('staff')
          .select('*')
          .eq('merchant_id', merchantId);
          
        if (error) throw error;
        
        setStaffList(data as Staff[]);
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to fetch staff members",
          variant: "destructive"
        });
        console.error('Error fetching staff:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStaff();
  }, [merchantId]);

  const handleStaffChange = (staffId: string, isChecked: boolean) => {
    if (isChecked) {
      onChange([...selectedStaffIds, staffId]);
    } else {
      onChange(selectedStaffIds.filter(id => id !== staffId));
    }
  };

  const handleAddNewStaff = async () => {
    if (!newStaffName.trim()) {
      toast({
        title: "Error",
        description: "Staff name cannot be empty",
        variant: "destructive"
      });
      return;
    }

    setIsSubmittingStaff(true);
    try {
      const { data, error } = await supabase
        .from('staff')
        .insert({
          merchant_id: merchantId,
          name: newStaffName.trim(),
          assigned_service_ids: serviceId ? [serviceId] : []
        })
        .select();
        
      if (error) throw error;
      
      setStaffList([...staffList, data[0] as Staff]);
      
      // Add the new staff to selected staff
      if (serviceId) {
        onChange([...selectedStaffIds, data[0].id]);
      }
      
      toast({
        title: "Success",
        description: "Staff member added successfully"
      });
      
      setNewStaffName('');
      setShowAddStaffDialog(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to add staff member",
        variant: "destructive"
      });
      console.error('Error adding staff:', error);
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="font-medium">
          Assign Stylists {isRequired && <span className="text-red-500">*</span>}
          {isRequired && selectedStaffIds.length === 0 && (
            <span className="block text-xs text-red-500 mt-1">
              At least one stylist must be assigned
            </span>
          )}
        </div>
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={() => setShowAddStaffDialog(true)}
        >
          <UserPlus className="h-4 w-4 mr-1" /> Add New
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : staffList.length === 0 ? (
        <div className="text-center py-4 border rounded-md bg-muted/20">
          <p className="text-sm text-muted-foreground mb-2">No stylists added yet</p>
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={() => setShowAddStaffDialog(true)}
          >
            <PlusCircle className="h-4 w-4 mr-1" /> Add Your First Stylist
          </Button>
        </div>
      ) : (
        <div className="grid gap-2">
          {staffList.map((staff) => (
            <div 
              key={staff.id} 
              className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/30"
            >
              <Checkbox
                id={`staff-${staff.id}`}
                checked={selectedStaffIds.includes(staff.id)}
                onCheckedChange={(checked) => 
                  handleStaffChange(staff.id, checked === true)
                }
              />
              <Label 
                htmlFor={`staff-${staff.id}`}
                className="flex-grow cursor-pointer"
              >
                {staff.name}
              </Label>
              <Badge variant="outline" className="ml-auto">
                {staff.assigned_service_ids?.length || 0} services
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* Add New Staff Dialog */}
      <Dialog open={showAddStaffDialog} onOpenChange={setShowAddStaffDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Stylist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="staffName">Stylist Name</Label>
              <Input
                id="staffName"
                placeholder="Enter stylist name"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowAddStaffDialog(false)}
              disabled={isSubmittingStaff}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleAddNewStaff}
              disabled={isSubmittingStaff || !newStaffName.trim()}
            >
              {isSubmittingStaff ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>Add Stylist</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffSelector;
