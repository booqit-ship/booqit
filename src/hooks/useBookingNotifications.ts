
import { useAuth } from '@/contexts/AuthContext';
import { notifyMerchantOfNewBooking, notifyCustomerOfBookingConfirmation } from '@/services/bookingNotificationService';

export const useBookingNotifications = () => {
  const { userId, userRole } = useAuth();

  const triggerNewBookingNotification = async (
    merchantId: string,
    bookingData: {
      customerName: string;
      serviceName: string;
      dateTime: string;
      bookingId: string;
    }
  ) => {
    console.log('🔔 Triggering new booking notification for merchant:', merchantId);
    await notifyMerchantOfNewBooking(merchantId, bookingData);
  };

  const triggerBookingConfirmationNotification = async (
    customerId: string,
    bookingData: {
      merchantName: string;
      serviceName: string;
      dateTime: string;
      bookingId: string;
    }
  ) => {
    console.log('🔔 Triggering booking confirmation for customer:', customerId);
    await notifyCustomerOfBookingConfirmation(customerId, bookingData);
  };

  return {
    triggerNewBookingNotification,
    triggerBookingConfirmationNotification
  };
};
