
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
import { MapPin } from 'lucide-react';

interface LocationPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAllow: () => void;
  onDeny: () => void;
}

const LocationPermissionDialog: React.FC<LocationPermissionDialogProps> = ({
  open,
  onOpenChange,
  onAllow,
  onDeny
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-booqit-primary/10 rounded-full">
            <MapPin className="w-8 h-8 text-booqit-primary" />
          </div>
          <AlertDialogTitle className="text-center text-xl">
            Allow Location Access
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-gray-600">
            Booqit needs access to your location to find nearby services and show you the most relevant options. 
            Your location is only used to improve your experience and is never shared with third parties.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          <AlertDialogCancel onClick={onDeny} className="w-full sm:w-auto">
            Not Now
          </AlertDialogCancel>
          <AlertDialogAction onClick={onAllow} className="w-full sm:w-auto bg-booqit-primary hover:bg-booqit-primary/90">
            Allow Location
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default LocationPermissionDialog;
