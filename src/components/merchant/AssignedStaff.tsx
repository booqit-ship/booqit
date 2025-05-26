
import React, { useState, useEffect } from 'react';
import { Staff } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Loader2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AssignedStaffProps {
  merchantId: string;
  className?: string;
  maxDisplay?: number;
}

const AssignedStaff: React.FC<AssignedStaffProps> = ({ 
  merchantId, 
  className,
  maxDisplay = 2 
}) => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
        
        setStaff(data as Staff[]);
      } catch (error) {
        console.error('Error fetching staff:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStaff();
  }, [merchantId]);

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
      <span className="text-sm text-amber-600 flex items-center font-medium">
        <User className="h-3.5 w-3.5 mr-1.5" />
        No stylists available
      </span>
    );
  }

  const visibleStaff = staff.slice(0, maxDisplay);
  const hasMore = staff.length > maxDisplay;
  const remainingCount = staff.length - maxDisplay;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {visibleStaff.map((s) => (
        <Badge 
          key={s.id} 
          variant="stylist" 
          className="py-1 px-2.5 text-xs flex items-center animate-fade-in"
        >
          <User className="h-3 w-3 mr-1.5" />
          {s.name}
        </Badge>
      ))}
      
      {hasMore && (
        <Badge 
          variant="outline" 
          className="py-1 px-2.5 text-xs flex items-center bg-muted/30"
        >
          +{remainingCount} more
        </Badge>
      )}
    </div>
  );
};

export default AssignedStaff;
