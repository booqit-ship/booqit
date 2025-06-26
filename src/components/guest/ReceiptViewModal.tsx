
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ReceiptTemplate from '@/components/receipt/ReceiptTemplate';
import { downloadReceiptImage, type ReceiptData } from '@/utils/receiptDownload';

interface ReceiptViewModalProps {
  bookingId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ReceiptResponse {
  success: boolean;
  error?: string;
  data?: ReceiptData;
}

const ReceiptViewModal: React.FC<ReceiptViewModalProps> = ({
  bookingId,
  isOpen,
  onClose
}) => {
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (isOpen && bookingId) {
      fetchReceiptData();
    }
  }, [isOpen, bookingId]);

  const fetchReceiptData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_guest_booking_receipt_data', {
        p_booking_id: bookingId
      });

      if (error) {
        console.error('Receipt data error:', error);
        toast.error('Failed to load receipt data');
        return;
      }

      const response = data as ReceiptResponse;
      if (!response.success) {
        toast.error(response.error || 'Failed to load receipt data');
        return;
      }

      setReceiptData(response.data || null);
    } catch (error) {
      console.error('Receipt data error:', error);
      toast.error('Failed to load receipt data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!receiptData) return;

    setIsDownloading(true);
    try {
      await downloadReceiptImage(receiptData, `modal-receipt-${bookingId}`);
      toast.success('Receipt downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download receipt');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="font-righteous">Receipt</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleDownload}
                disabled={isDownloading || !receiptData}
                variant="outline"
                size="sm"
                className="font-poppins"
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download
              </Button>
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              <span className="ml-2 font-poppins text-gray-600">Loading receipt...</span>
            </div>
          ) : receiptData ? (
            <div>
              <div id={`modal-receipt-${bookingId}`}>
                <ReceiptTemplate data={receiptData} forImage={false} />
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="font-poppins text-gray-600">Failed to load receipt data</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptViewModal;
