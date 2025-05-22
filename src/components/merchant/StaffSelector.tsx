
import React, { useState, useEffect } from 'react';
import { Staff } from '@/types';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { User, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface StaffSelectorProps {
  merchantId: string;
  serviceId: string | null;
  selectedStaffIds: string[];
  onChange: (staffIds: string[]) => void;
  readOnly?: boolean;
}

const StaffSelector: React.FC<StaffSelectorProps> = ({
  merchantId,
  serviceId,
  selectedStaffIds,
  onChange,
  readOnly = false
}) => {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // Fetch all staff for this merchant
  useEffect(() => {
    const fetchStaff = async () => {
      if (!merchantId) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('staff')
          .select('*')
          .eq('merchant_id', merchantId)
          .order('name', { ascending: true });
          
        if (error) throw error;
        
        setStaffList(data as Staff[]);
      } catch (error) {
        console.error('Error fetching staff:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStaff();
  }, [merchantId]);

  // Filter the staff list to get selected staff
  const selectedStaff = staffList.filter(staff => selectedStaffIds.includes(staff.id));

  // Handle removing a staff member
  const handleRemoveStaff = (staffId: string) => {
    if (readOnly) return;
    onChange(selectedStaffIds.filter(id => id !== staffId));
  };

  // Handle adding a staff member
  const handleAddStaff = (staffId: string) => {
    if (readOnly) return;
    if (!selectedStaffIds.includes(staffId)) {
      onChange([...selectedStaffIds, staffId]);
    }
  };

  // Get available staff (not already selected)
  const availableStaff = staffList.filter(staff => !selectedStaffIds.includes(staff.id));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">Loading stylists...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Display selected staff */}
      <div className="flex flex-wrap gap-1.5">
        {selectedStaff.map((staff) => (
          <Badge 
            key={staff.id} 
            variant="stylist" 
            className="py-1 px-2.5 text-xs flex items-center group"
          >
            <User className="h-3 w-3 mr-1.5" />
            {staff.name}
            {!readOnly && (
              <button 
                onClick={() => handleRemoveStaff(staff.id)}
                className="ml-1.5 p-0.5 rounded-full opacity-60 hover:opacity-100 hover:bg-booqit-primary/20 focus:outline-none transition-opacity"
                title="Remove stylist"
                type="button"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
      </div>
      
      {/* Display available staff to add, only if not readOnly */}
      {!readOnly && availableStaff.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground mb-1.5">Add more stylists:</p>
          <div className="flex flex-wrap gap-1.5">
            {availableStaff.map((staff) => (
              <Badge 
                key={staff.id}
                variant="outline"
                className="py-1 px-2.5 text-xs flex items-center cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleAddStaff(staff.id)}
              >
                <User className="h-3 w-3 mr-1.5" />
                {staff.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {/* If no staff at all, show a message */}
      {staffList.length === 0 && (
        <div className="text-sm text-muted-foreground mt-2">
          No stylists found. Please add stylists first.
        </div>
      )}
    </div>
  );
};

export default StaffSelector;
