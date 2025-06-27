
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Download, X, Loader2 } from 'lucide-react';
import ReceiptTemplate from '@/components/receipt/ReceiptTemplate';

interface ReceiptViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string | null;
}

export const ReceiptViewModal: React.FC<ReceiptViewModalProps> = ({
  isOpen,
  onClose,
  bookingId
}) => {
  const { toast } = useToast();
  const [receiptData, setReceiptData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (isOpen && bookingId) {
      fetchReceiptData();
    }
  }, [isOpen, bookingId]);

  const fetchReceiptData = async () => {
    if (!bookingId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_guest_booking_receipt_data', {
        p_booking_id: bookingId
      });

      if (error) {
        console.error('Error fetching receipt data:', error);
        toast({
          title: "Receipt Error",
          description: "Failed to load receipt data",
          variant: "destructive",
        });
        return;
      }

      const result = data as { success: boolean; data?: any; error?: string };

      if (!result || !result.success) {
        toast({
          title: "Receipt Error",
          description: result?.error || "Receipt data not available",
          variant: "destructive",
        });
        return;
      }

      setReceiptData(result.data);
    } catch (error) {
      console.error('Error fetching receipt data:', error);
      toast({
        title: "Receipt Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!receiptData || !bookingId) return;

    setIsDownloading(true);
    try {
      const { downloadReceiptImage } = await import('@/utils/receiptDownload');
      
      await downloadReceiptImage(receiptData, `receipt-modal-${bookingId}`);
      
      toast({
        title: "Receipt Downloaded",
        description: "Receipt has been downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast({
        title: "Download Error",
        description: "Failed to download receipt",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl h-[95vh] max-h-[95vh] overflow-hidden p-2 sm:p-4 md:p-6">
        <DialogHeader className="flex flex-col gap-2 p-2 sm:p-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="font-righteous text-sm sm:text-base md:text-lg text-gray-800">
              Booking Receipt
            </DialogTitle>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 sm:h-9 sm:w-9"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <Button
            onClick={handleDownload}
            disabled={!receiptData || isDownloading}
            size="sm"
            className="bg-green-600 hover:bg-green-700 w-full h-9 sm:h-10 text-xs sm:text-sm"
          >
            {isDownloading ? (
              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
            )}
            {isDownloading ? 'Downloading...' : 'Download Receipt'}
          </Button>
        </DialogHeader>
        
        <div className="overflow-y-auto flex-1 p-1 sm:p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-purple-600"></div>
              <span className="ml-2 sm:ml-3 text-gray-600 font-poppins text-xs sm:text-sm">Loading...</span>
            </div>
          ) : receiptData ? (
            <div id={`receipt-modal-${bookingId}`} className="bg-white scale-75 sm:scale-90 md:scale-100 origin-top">
              <ReceiptTemplate data={receiptData} forMobile={true} />
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12">
              <p className="text-gray-600 font-poppins text-xs sm:text-sm">Receipt not available</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
