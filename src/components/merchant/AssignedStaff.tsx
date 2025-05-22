
import React, { useState, useEffect } from 'react';
import { Staff } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Loader2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AssignedStaffProps {
  serviceId: string;
  className?: string;
}

const AssignedStaff: React.FC<AssignedStaffProps> = ({ serviceId, className }) => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchAssignedStaff = async () => {
      if (!serviceId) return;
      
      setIsLoading(true);
      try {
        // Query staff where assigned_service_ids contains the current service ID
        const { data, error } = await supabase
          .from('staff')
          .select('*')
          .contains('assigned_service_ids', [serviceId]);
          
        if (error) throw error;
        
        setStaff(data as Staff[]);
      } catch (error) {
        console.error('Error fetching assigned staff:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAssignedStaff();
  }, [serviceId]);

  if (isLoading) {
    return (
      <div className="flex items-center text-sm text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin mr-1" />
        <span>Loading</span>
      </div>
    );
  }

  if (!staff.length) {
    return (
      <span className="text-sm text-amber-600 flex items-center">
        <User className="h-3 w-3 mr-1" />
        No stylists assigned
      </span>
    );
  }

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {staff.map((s) => (
        <Badge key={s.id} variant="outline" className="bg-muted/40 text-xs">
          <User className="h-3 w-3 mr-1" />
          {s.name}
        </Badge>
      ))}
    </div>
  );
};

export default AssignedStaff;
