
-- Fix the trigger function to handle guest bookings properly
CREATE OR REPLACE FUNCTION public.trigger_automatic_notifications()
RETURNS TRIGGER AS $$
DECLARE
  merchant_user_id UUID;
  customer_name TEXT;
  merchant_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- New booking → notify merchant (works for both guest and user bookings)
    SELECT m.user_id INTO merchant_user_id
      FROM merchants m
      WHERE m.id = NEW.merchant_id;

    -- Get customer name from booking record (works for both guest and user bookings)
    customer_name := COALESCE(NEW.customer_name, 'Customer');

    -- Only insert notification log if we have a valid merchant user_id
    IF merchant_user_id IS NOT NULL THEN
      INSERT INTO notification_logs (user_id, title, body, type)
        VALUES (
          merchant_user_id,
          'New Booking! 📅',
          customer_name || ' has booked a service for ' ||
          to_char(NEW.date, 'Mon DD') || ' at ' || NEW.time_slot,
          'new_booking'
        );
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Booking status changes: confirmed, completed, cancelled
    IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
      -- Only notify authenticated users (not guest users)
      IF NEW.user_id IS NOT NULL THEN
        INSERT INTO notification_logs (user_id, title, body, type)
          VALUES (
            NEW.user_id,
            'Booking Confirmed!',
            'Your booking for ' || to_char(NEW.date, 'Mon DD') || ' at ' || NEW.time_slot || ' is confirmed!',
            'booking_confirmed'
          );
      END IF;
    ELSIF NEW.status = 'completed' AND OLD.status != 'completed' THEN
      -- Request review - only for authenticated users
      IF NEW.user_id IS NOT NULL THEN
        SELECT shop_name INTO merchant_name FROM merchants WHERE id = NEW.merchant_id;
        INSERT INTO notification_logs (user_id, title, body, type)
          VALUES (
            NEW.user_id,
            'How was your visit? ⭐',
            'Hope you enjoyed your service at ' || merchant_name || '! Tap to leave a review.',
            'booking_completed'
          );
      END IF;
    ELSIF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
      -- Get merchant info
      SELECT m.user_id, m.shop_name INTO merchant_user_id, merchant_name
        FROM merchants m
        WHERE m.id = NEW.merchant_id;

      -- Notify merchant
      IF merchant_user_id IS NOT NULL THEN
        INSERT INTO notification_logs (user_id, title, body, type)
          VALUES (
            merchant_user_id,
            'Booking Cancelled',
            'A booking by ' || customer_name || ' has been cancelled.',
            'booking_cancelled'
          );
      END IF;
      
      -- Notify customer only if it's an authenticated user
      IF NEW.user_id IS NOT NULL THEN
        INSERT INTO notification_logs (user_id, title, body, type)
          VALUES (
            NEW.user_id,
            'Booking Cancelled',
            'Your booking at ' || merchant_name || ' has been cancelled.',
            'booking_cancelled'
          );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix the booking reminder function to handle guest bookings
CREATE OR REPLACE FUNCTION public.schedule_booking_reminder()
RETURNS TRIGGER AS $$
DECLARE
  cust_id UUID;
  book_time TIMESTAMP;
BEGIN
  -- Only schedule reminders for authenticated users (not guest bookings)
  IF NEW.status = 'confirmed' AND NEW.user_id IS NOT NULL THEN
    cust_id := NEW.user_id;
    book_time := NEW.date::timestamp + NEW.time_slot::interval;
    IF book_time > now() + INTERVAL '25 hours' THEN -- Only for bookings >24h away
      INSERT INTO notification_queue (user_id, scheduled_at, title, body, type, data)
      VALUES (
        cust_id,
        book_time - INTERVAL '24 hours',
        'Upcoming Appointment Reminder',
        'You have a booking tomorrow at ' || to_char(book_time, 'HH12:MI AM, Mon DD'),
        'upcoming_appointment',
        jsonb_build_object('booking_id', NEW.id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
