
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

      // Handle the response with proper error checking
      const result = data as { success: boolean; data?: any; error?: string } | null;

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
      // Import the receipt download utility dynamically
      const { downloadReceiptImage } = await import('@/utils/receiptDownload');
      
      // Generate and download receipt
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="font-righteous text-xl text-gray-800">
            Booking Receipt
          </DialogTitle>
          <div className="flex gap-2">
            <Button
              onClick={handleDownload}
              disabled={!receiptData || isDownloading}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-1" />
              )}
              Download
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[calc(90vh-8rem)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-600 font-poppins">Loading receipt...</span>
            </div>
          ) : receiptData ? (
            <div id={`receipt-modal-${bookingId}`}>
              <ReceiptTemplate data={receiptData} />
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 font-poppins">Receipt data not available</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
