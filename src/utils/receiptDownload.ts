
import html2canvas from 'html2canvas';
import ReceiptTemplate from '@/components/receipt/ReceiptTemplate';
import React from 'react';
import { createRoot } from 'react-dom/client';

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

export const downloadReceiptImage = async (data: ReceiptData, elementId: string): Promise<void> => {
  try {
    // Get the element that contains the receipt
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Receipt element not found');
    }

    // Wait for any images to load
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate canvas from the element
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: element.offsetWidth,
      height: element.offsetHeight,
    });

    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `receipt-${data.bookingId}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    }, 'image/png');
  } catch (error) {
    console.error('Error generating receipt image:', error);
    throw error;
  }
};

export const triggerAutoDownload = async (data: ReceiptData, containerId: string, delay: number = 1000): Promise<void> => {
  try {
    // Create a container for the receipt
    const container = document.createElement('div');
    container.id = containerId;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '800px';
    container.style.backgroundColor = 'white';
    container.style.padding = '32px';
    
    document.body.appendChild(container);
    
    // Create a root and render the receipt component
    const root = createRoot(container);
    root.render(React.createElement(ReceiptTemplate, { 
      data: data, 
      forImage: true 
    }));
    
    // Wait for render to complete
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Generate and download the image
    await downloadReceiptImage(data, containerId);
    
    // Clean up
    root.unmount();
    document.body.removeChild(container);
  } catch (error) {
    console.error('Error in auto download:', error);
    throw error;
  }
};
