
import React, { useState, useEffect } from 'react';
import { Staff } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, MoreHorizontal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AssignedStaffProps {
  serviceId: string;
  className?: string;
  maxDisplay?: number;
}

const AssignedStaff: React.FC<AssignedStaffProps> = ({ 
  serviceId, 
  className,
  maxDisplay = 2 
}) => {
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
      <span className="text-sm text-amber-600 flex items-center font-medium">
        <User className="h-3.5 w-3.5 mr-1.5" />
        No stylists assigned
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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="outline" 
                className="py-1 px-2.5 text-xs flex items-center cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <MoreHorizontal className="h-3 w-3 mr-1" />
                +{remainingCount} more
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="p-2">
              <div className="text-xs font-medium mb-1">All assigned stylists:</div>
              <ul className="text-xs space-y-1">
                {staff.map(s => (
                  <li key={s.id} className="flex items-center">
                    <User className="h-3 w-3 mr-1.5" />
                    {s.name}
                  </li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

export default AssignedStaff;
