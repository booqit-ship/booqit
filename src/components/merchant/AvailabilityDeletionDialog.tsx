
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
} from "@/components/ui/alert-dialog";
import { Loader2 } from 'lucide-react';

interface AvailabilityDeletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
  staffName: string;
  date: string;
}

const AvailabilityDeletionDialog: React.FC<AvailabilityDeletionDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
  staffName,
  date
}) => {
  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-righteous font-medium">
            Delete Availability Settings?
          </AlertDialogTitle>
          <AlertDialogDescription className="font-poppins">
            Are you sure you want to delete the availability settings for{' '}
            <span className="font-medium">{staffName}</span> on{' '}
            <span className="font-medium">{date}</span>?
            <br />
            <br />
            This will remove any holidays or blocked time slots for this date.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="font-poppins" disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            className="bg-destructive hover:bg-destructive/90 font-poppins"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default AvailabilityDeletionDialog;
