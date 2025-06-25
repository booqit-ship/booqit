
import { supabase } from '@/integrations/supabase/client';

export interface NotificationData {
  type: 'new_booking' | 'booking_confirmed' | 'booking_cancelled' | 'booking_completed' | 'reminder';
  bookingId: string;
  customerName?: string;
  shopName?: string;
  serviceName?: string;
  dateTime?: string;
  [key: string]: any;
}

/**
 * Service for managing notification templates and ensuring consistency
 */
export class NotificationTemplateService {
  
  /**
   * Format date and time consistently across all notifications
   */
  static formatDateTime(date: string, timeSlot: string): string {
    try {
      const bookingDate = new Date(date + 'T' + timeSlot);
      const formattedDate = bookingDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      const formattedTime = bookingDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      return `${formattedDate} at ${formattedTime}`;
    } catch (error) {
      console.error('❌ Error formatting date/time:', error);
      return `${date} at ${timeSlot}`;
    }
  }

  /**
   * Get standardized notification templates
   */
  static getNotificationTemplate(type: NotificationData['type'], data: NotificationData) {
    switch (type) {
      case 'new_booking':
        return {
          title: '📅 New Booking!',
          body: `${data.customerName || 'Customer'} has booked ${data.serviceName || 'a service'} for ${data.dateTime}`,
          data: {
            type: 'new_booking',
            bookingId: data.bookingId,
            customerName: data.customerName,
            serviceName: data.serviceName,
            dateTime: data.dateTime
          }
        };

      case 'booking_confirmed':
        return {
          title: '🎉 Booking Confirmed!',
          body: `Your appointment at ${data.shopName || 'the salon'} for ${data.serviceName || 'service'} on ${data.dateTime} is confirmed!`,
          data: {
            type: 'booking_confirmed',
            bookingId: data.bookingId,
            shopName: data.shopName,
            serviceName: data.serviceName,
            dateTime: data.dateTime
          }
        };

      case 'booking_cancelled':
        return {
          title: '❌ Booking Cancelled',
          body: data.customerName 
            ? `${data.customerName} has cancelled their appointment for ${data.dateTime}`
            : `Your appointment at ${data.shopName || 'the salon'} for ${data.dateTime} has been cancelled.`,
          data: {
            type: 'booking_cancelled',
            bookingId: data.bookingId,
            customerName: data.customerName,
            shopName: data.shopName,
            serviceName: data.serviceName,
            dateTime: data.dateTime
          }
        };

      case 'booking_completed':
        return {
          title: '⭐ How was your visit?',
          body: `Hope you enjoyed your service at ${data.shopName || 'the salon'}! Tap to leave a review.`,
          data: {
            type: 'service_completed',
            bookingId: data.bookingId,
            shopName: data.shopName,
            action: 'review'
          }
        };

      case 'reminder':
        return {
          title: '⏰ Upcoming Appointment',
          body: `You have an appointment at ${data.shopName || 'the salon'} tomorrow at ${data.dateTime}`,
          data: {
            type: 'upcoming_appointment',
            bookingId: data.bookingId,
            shopName: data.shopName,
            serviceName: data.serviceName,
            dateTime: data.dateTime
          }
        };

      default:
        return {
          title: '🔔 Notification',
          body: 'You have a new notification',
          data: { type: 'general', bookingId: data.bookingId }
        };
    }
  }

  /**
   * Send notification using standardized template
   */
  static async sendStandardizedNotification(
    userId: string,
    type: NotificationData['type'],
    data: NotificationData
  ): Promise<boolean> {
    try {
      const template = this.getNotificationTemplate(type, data);
      
      const { data: response, error } = await supabase.functions.invoke('send-notification', {
        body: {
          userId,
          title: template.title,
          body: template.body,
          data: template.data
        }
      });

      if (error) {
        console.error('❌ Error sending standardized notification:', error);
        return false;
      }

      console.log('✅ Standardized notification sent successfully:', response);
      return true;
    } catch (error) {
      console.error('❌ Error in sendStandardizedNotification:', error);
      return false;
    }
  }
}
