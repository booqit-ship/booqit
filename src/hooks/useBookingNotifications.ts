
import { useCallback } from "react";
import { sendWelcomeNotification, sendNewBookingNotification, sendBookingCompletedNotification, sendDailyReminderNotification } from "@/services/eventNotificationService";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types";

/**
 * Hook for triggering key engagement and booking notifications via business logic.
 */
export function useBookingNotifications() {
  const { user, userRole, userId } = useAuth();

  // Trigger after user login
  const notifyWelcome = useCallback(() => {
    if (!userId || !userRole || !user?.user_metadata?.name) return;
    sendWelcomeNotification(userId, userRole as UserRole, user.user_metadata.name);
  }, [userId, userRole, user]);

  // Trigger for new booking (call in booking flow after successful booking)
  const notifyNewBooking = useCallback(
    (merchantUserId: string, customerName: string, serviceName: string, timeSlot: string, bookingId: string) => {
      sendNewBookingNotification(merchantUserId, customerName, serviceName, timeSlot, bookingId);
    },
    []
  );

  // Trigger to prompt customer for review after booking completion
  const notifyBookingComplete = useCallback(
    (customerId: string, merchantName: string, bookingId: string) => {
      sendBookingCompletedNotification(customerId, merchantName, bookingId);
    },
    []
  );

  // Generic daily reminder notification (should be scheduled server-side via cron)
  const notifyDailyReminder = useCallback(() => {
    if (!userId || !userRole || !user?.user_metadata?.name) return;
    sendDailyReminderNotification(userId, userRole as UserRole, user.user_metadata.name);
  }, [userId, userRole, user]);

  return {
    notifyWelcome,
    notifyNewBooking,
    notifyBookingComplete,
    notifyDailyReminder,
  };
}
