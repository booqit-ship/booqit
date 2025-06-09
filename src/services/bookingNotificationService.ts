
import { sendNotificationToUser } from './notificationService';

export const notifyMerchantOfNewBooking = async (
  merchantId: string,
  bookingDetails: {
    customerName: string;
    serviceName: string;
    dateTime: string;
    bookingId: string;
  }
) => {
  try {
    console.log('📤 Sending new booking notification to merchant:', merchantId);
    
    await sendNotificationToUser(merchantId, {
      title: 'New Booking! 📅',
      body: `${bookingDetails.customerName} has booked ${bookingDetails.serviceName} for ${bookingDetails.dateTime}`,
      data: {
        type: 'new_booking',
        booking_id: bookingDetails.bookingId,
        merchant_id: merchantId
      }
    });
    
    console.log('✅ New booking notification sent successfully');
  } catch (error) {
    console.error('❌ Error sending new booking notification:', error);
  }
};

export const notifyCustomerOfBookingConfirmation = async (
  customerId: string,
  bookingDetails: {
    merchantName: string;
    serviceName: string;
    dateTime: string;
    bookingId: string;
  }
) => {
  try {
    console.log('📤 Sending booking confirmation to customer:', customerId);
    
    await sendNotificationToUser(customerId, {
      title: 'Booking Confirmed! ✅',
      body: `Your appointment at ${bookingDetails.merchantName} for ${bookingDetails.serviceName} on ${bookingDetails.dateTime} is confirmed`,
      data: {
        type: 'booking_confirmed',
        booking_id: bookingDetails.bookingId
      }
    });
    
    console.log('✅ Booking confirmation sent successfully');
  } catch (error) {
    console.error('❌ Error sending booking confirmation:', error);
  }
};

export const notifyCustomerOfBookingReminder = async (
  customerId: string,
  bookingDetails: {
    merchantName: string;
    serviceName: string;
    dateTime: string;
    bookingId: string;
  }
) => {
  try {
    console.log('📤 Sending booking reminder to customer:', customerId);
    
    await sendNotificationToUser(customerId, {
      title: 'Upcoming Appointment! ⏰',
      body: `Don't forget your appointment at ${bookingDetails.merchantName} tomorrow at ${bookingDetails.dateTime}`,
      data: {
        type: 'booking_reminder',
        booking_id: bookingDetails.bookingId
      }
    });
    
    console.log('✅ Booking reminder sent successfully');
  } catch (error) {
    console.error('❌ Error sending booking reminder:', error);
  }
};
