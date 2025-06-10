
import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface BookingConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  actionType: 'complete' | 'cancel';
  customerName?: string;
  serviceName?: string;
  timeSlot?: string;
  isLoading?: boolean;
}

const BookingConfirmationDialog: React.FC<BookingConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  actionType,
  customerName,
  serviceName,
  timeSlot,
  isLoading = false
}) => {
  const isComplete = actionType === 'complete';
  
  const getIcon = () => {
    if (isComplete) {
      return <CheckCircle className="h-6 w-6 text-green-600" />;
    }
    return <XCircle className="h-6 w-6 text-red-600" />;
  };

  const getTitle = () => {
    return isComplete ? 'Complete Booking?' : 'Cancel Booking?';
  };

  const getDescription = () => {
    const action = isComplete ? 'mark as completed' : 'cancel';
    return `Are you sure you want to ${action} this booking? This action cannot be undone.`;
  };

  const getActionText = () => {
    if (isLoading) {
      return isComplete ? 'Completing...' : 'Cancelling...';
    }
    return isComplete ? 'Complete Booking' : 'Cancel Booking';
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {getIcon()}
            {getTitle()}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            <div className="space-y-2">
              <p>{getDescription()}</p>
              
              {customerName && (
                <div className="bg-muted/50 p-3 rounded-md space-y-1 text-sm">
                  <div><strong>Customer:</strong> {customerName}</div>
                  {serviceName && <div><strong>Service:</strong> {serviceName}</div>}
                  {timeSlot && <div><strong>Time:</strong> {timeSlot}</div>}
                </div>
              )}
              
              {isComplete && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded">
                  <AlertTriangle className="h-4 w-4" />
                  This will mark the booking as completed and count towards earnings.
                </div>
              )}
              
              {!isComplete && (
                <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 p-2 rounded">
                  <AlertTriangle className="h-4 w-4" />
                  This will cancel the booking and free up the time slot.
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            No, Keep as is
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={isComplete 
              ? "bg-green-600 hover:bg-green-700 focus:ring-green-600" 
              : "bg-red-600 hover:bg-red-700 focus:ring-red-600"
            }
          >
            {getActionText()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BookingConfirmationDialog;
