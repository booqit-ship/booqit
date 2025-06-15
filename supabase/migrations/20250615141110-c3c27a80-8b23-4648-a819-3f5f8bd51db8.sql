
-- 1) Table for user notification preferences (customizable per type)
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Ensure only users can manage their own notification prefs
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own notif prefs"
  ON user_notification_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2) Expand notification_logs table for history/analytics (add details/failures if missing)
ALTER TABLE notification_logs
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS fcm_response TEXT;

-- 3) Notification queue table for scheduled/reminder notifications
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL,
  data JSONB,
  status TEXT DEFAULT 'pending',
  error_message TEXT
);

-- RLS for user queue
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own queue items"
  ON notification_queue FOR SELECT USING (auth.uid() = user_id);

-- 4) FUNCTION: Schedule reminder 24h before an appointment
CREATE OR REPLACE FUNCTION schedule_booking_reminder()
RETURNS TRIGGER AS $$
DECLARE
  cust_id UUID;
  book_time TIMESTAMP;
  book_title TEXT;
  book_body TEXT;
BEGIN
  IF NEW.status = 'confirmed' THEN
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

-- Trigger on bookings to schedule reminders on 'confirmed'
DROP TRIGGER IF EXISTS tr_schedule_booking_reminder ON bookings;
CREATE TRIGGER tr_schedule_booking_reminder
  AFTER INSERT OR UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION schedule_booking_reminder();

-- 5) FUNCTION: Auto-log and call notification logic on important booking events
CREATE OR REPLACE FUNCTION trigger_automatic_notifications()
RETURNS TRIGGER AS $$
DECLARE
  merchant_user_id UUID;
  customer_name TEXT;
  merchant_name TEXT;
  b_time TIMESTAMP;
  data_payload JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- New booking → notify merchant
    SELECT m.user_id, p.name INTO merchant_user_id, customer_name
      FROM merchants m
      JOIN profiles p ON p.id = NEW.user_id
      WHERE m.id = NEW.merchant_id;

    INSERT INTO notification_logs (user_id, title, body, type)
      VALUES (
        merchant_user_id,
        'New Booking! 📅',
        customer_name || ' has booked a service for ' ||
        to_char(NEW.date, 'Mon DD') || ' at ' || NEW.time_slot,
        'new_booking'
      );

    -- Insert function call to edge function via pg_net if desired (see below for example)

  ELSIF TG_OP = 'UPDATE' THEN
    -- Booking status changes: confirmed, completed, cancelled
    IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
      -- Notify customer
      INSERT INTO notification_logs (user_id, title, body, type)
        VALUES (
          NEW.user_id,
          'Booking Confirmed!',
          'Your booking for ' || to_char(NEW.date, 'Mon DD') || ' at ' || NEW.time_slot || ' is confirmed!',
          'booking_confirmed'
        );
    ELSIF NEW.status = 'completed' AND OLD.status != 'completed' THEN
      -- Request review
      SELECT shop_name INTO merchant_name FROM merchants WHERE id = NEW.merchant_id;
      INSERT INTO notification_logs (user_id, title, body, type)
        VALUES (
          NEW.user_id,
          'How was your visit? ⭐',
          'Hope you enjoyed your service at ' || merchant_name || '! Tap to leave a review.',
          'booking_completed'
        );
    ELSIF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
      -- Notify both parties
      SELECT m.user_id, p.name, m.shop_name INTO merchant_user_id, customer_name, merchant_name
        FROM merchants m
        JOIN profiles p ON p.id = NEW.user_id
        WHERE m.id = NEW.merchant_id;

      INSERT INTO notification_logs (user_id, title, body, type)
        VALUES (
          merchant_user_id,
          'Booking Cancelled',
          'A booking by '||customer_name||' has been cancelled.',
          'booking_cancelled'
        );
      INSERT INTO notification_logs (user_id, title, body, type)
        VALUES (
          NEW.user_id,
          'Booking Cancelled',
          'Your booking at '|| merchant_name ||' has been cancelled.',
          'booking_cancelled'
        );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach to bookings table for insert & status-change events
DROP TRIGGER IF EXISTS tr_booking_auto_notifications ON bookings;
CREATE TRIGGER tr_booking_auto_notifications
  AFTER INSERT OR UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_automatic_notifications();

-- 6) (Optional) Setup for weekly reminders and other engagement via cron + pg_net/edge function
-- You may already have this, e.g., see send_weekly_reminders().
-- Ensure notification_queue is populated for scheduled tasks or that cron jobs call the appropriate edge functions.

