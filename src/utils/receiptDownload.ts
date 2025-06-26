
import html2canvas from 'html2canvas';

export interface ReceiptData {
  bookingId: string;
  merchant: {
    shop_name: string;
    address: string;
  };
  selectedServices: Array<{
    id: string;
    name: string;
    duration: number;
    price: number;
  }>;
  totalPrice: number;
  bookingDate: string;
  bookingTime: string;
  guestInfo: {
    name: string;
    phone: string;
    email?: string;
  };
  selectedStaffDetails?: {
    name: string;
  } | null;
}

export const generateReceiptImage = async (elementId: string): Promise<Blob> => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Receipt element not found');
  }

  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2, // Higher quality
    useCORS: true,
    allowTaint: true,
    width: 800,
    height: element.scrollHeight,
    scrollX: 0,
    scrollY: 0,
  });

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        throw new Error('Failed to generate image');
      }
    }, 'image/png', 1.0);
  });
};

export const downloadReceiptImage = async (
  receiptData: ReceiptData,
  elementId: string
): Promise<void> => {
  try {
    const blob = await generateReceiptImage(elementId);
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `booqit-receipt-${receiptData.bookingId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the object URL
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading receipt:', error);
    throw error;
  }
};

export const triggerAutoDownload = async (
  receiptData: ReceiptData,
  elementId: string,
  delay: number = 2000
): Promise<void> => {
  setTimeout(async () => {
    try {
      await downloadReceiptImage(receiptData, elementId);
    } catch (error) {
      console.error('Auto-download failed:', error);
    }
  }, delay);
};
