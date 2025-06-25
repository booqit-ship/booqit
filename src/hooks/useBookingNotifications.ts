
import { useCallback } from "react";
import { NotificationTemplateService } from "@/services/NotificationTemplateService";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types";

/**
 * ✅ STANDARDIZED Hook for triggering key engagement and booking notifications
 * Uses the new NotificationTemplateService for consistent messaging
 */
export function useBookingNotifications() {
  const { user, userRole, userId } = useAuth();

  // Trigger after user login
  const notifyWelcome = useCallback(() => {
    if (!userId || !userRole || !user?.user_metadata?.name) return;
    
    // Send welcome notification using standardized service
    NotificationTemplateService.sendStandardizedNotification(
      userId,
      'new_booking', // Using existing template structure
      {
        type: 'welcome',
        bookingId: '',
        customerName: user.user_metadata.name,
        serviceName: 'Welcome to Booqit',
        dateTime: new Date().toLocaleDateString()
      }
    );
  }, [userId, userRole, user]);

  // Trigger for new booking (call in booking flow after successful booking)
  const notifyNewBooking = useCallback(
    (merchantUserId: string, customerName: string, serviceName: string, dateTime: string, bookingId: string) => {
      NotificationTemplateService.sendStandardizedNotification(
        merchantUserId,
        'new_booking',
        {
          type: 'new_booking',
          bookingId,
          customerName,
          serviceName,
          dateTime
        }
      );
    },
    []
  );

  // Trigger to notify customer that booking is confirmed
  const notifyBookingConfirmed = useCallback(
    (customerId: string, shopName: string, serviceName: string, dateTime: string, bookingId: string) => {
      NotificationTemplateService.sendStandardizedNotification(
        customerId,
        'booking_confirmed',
        {
          type: 'booking_confirmed',
          bookingId,
          shopName,
          serviceName,
          dateTime
        }
      );
    },
    []
  );

  // Trigger to prompt customer for review after booking completion
  const notifyBookingComplete = useCallback(
    (customerId: string, merchantName: string, bookingId: string) => {
      NotificationTemplateService.sendStandardizedNotification(
        customerId,
        'booking_completed',
        {
          type: 'booking_completed',
          bookingId,
          shopName: merchantName,
          serviceName: '',
          dateTime: ''
        }
      );
    },
    []
  );

  // Generic daily reminder notification (should be scheduled server-side via cron)
  const notifyDailyReminder = useCallback(() => {
    if (!userId || !userRole || !user?.user_metadata?.name) return;
    
    NotificationTemplateService.sendStandardizedNotification(
      userId,
      'reminder',
      {
        type: 'reminder',
        bookingId: '',
        customerName: user.user_metadata.name,
        serviceName: '',
        dateTime: 'tomorrow'
      }
    );
  }, [userId, userRole, user]);

  return {
    notifyWelcome,
    notifyNewBooking,
    notifyBookingConfirmed,
    notifyBookingComplete,
    notifyDailyReminder,
  };
}
