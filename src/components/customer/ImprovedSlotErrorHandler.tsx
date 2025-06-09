
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface SlotErrorHandlerProps {
  error: string;
  onRetry: () => void;
  onRefreshSlots: () => void;
  totalDuration: number;
}

const ImprovedSlotErrorHandler: React.FC<SlotErrorHandlerProps> = ({
  error,
  onRetry,
  onRefreshSlots,
  totalDuration
}) => {
  const getErrorMessage = (error: string) => {
    if (error.includes('already booked') || error.includes('Slot booking failed')) {
      return {
        title: 'Time Slot Unavailable',
        message: `The selected time slot is no longer available for ${totalDuration} minutes. This might be because another customer just booked overlapping slots.`,
        suggestion: 'Please select a different time slot or refresh to see the latest availability.'
      };
    }
    
    if (error.includes('too soon')) {
      return {
        title: 'Booking Too Soon',
        message: 'This time slot is too close to the current time.',
        suggestion: 'Please select a slot at least 40 minutes from now.'
      };
    }
    
    return {
      title: 'Booking Error',
      message: error,
      suggestion: 'Please try again or contact support if the issue persists.'
    };
  };

  const errorInfo = getErrorMessage(error);

  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-medium text-red-800 font-poppins">{errorInfo.title}</h4>
            <p className="text-red-700 text-sm mt-1 font-poppins">{errorInfo.message}</p>
            <p className="text-red-600 text-sm mt-2 font-poppins">{errorInfo.suggestion}</p>
            
            <div className="flex space-x-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onRefreshSlots}
                className="text-red-700 border-red-300 hover:bg-red-100 font-poppins"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh Slots
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="text-red-700 border-red-300 hover:bg-red-100 font-poppins"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ImprovedSlotErrorHandler;
