
-- Add FCM token support to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS fcm_token TEXT,
ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_notification_sent TIMESTAMPTZ;

-- Create notifications log table
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'delivered'))
);

-- Enable RLS on notification_logs
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own notifications
CREATE POLICY "Users can read own notifications" ON notification_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow service role to insert notifications
CREATE POLICY "Service role can insert notifications" ON notification_logs
  FOR INSERT
  WITH CHECK (true);

-- Create function to trigger notifications on booking events
CREATE OR REPLACE FUNCTION trigger_booking_notification()
RETURNS TRIGGER AS $$
DECLARE
  merchant_user_id UUID;
  customer_user_id UUID;
  service_name TEXT;
  merchant_name TEXT;
  booking_datetime TEXT;
BEGIN
  -- Insert notification log for new bookings
  IF TG_OP = 'INSERT' THEN
    -- Get merchant user_id and shop name
    SELECT m.user_id, m.shop_name INTO merchant_user_id, merchant_name
    FROM merchants m
    JOIN services s ON s.merchant_id = m.id
    WHERE s.id = NEW.service_id;
    
    -- Get service name
    SELECT name INTO service_name FROM services WHERE id = NEW.service_id;
    
    -- Format booking datetime
    booking_datetime := to_char(NEW.date, 'Mon DD') || ' at ' || NEW.time_slot;
    
    -- Insert notification log for merchant
    INSERT INTO notification_logs (user_id, title, body, type)
    VALUES (
      merchant_user_id,
      'New Booking! 📅',
      NEW.customer_name || ' has booked ' || service_name || ' for ' || booking_datetime,
      'new_booking'
    );
    
    -- Trigger actual notification via Edge Function
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'userId', merchant_user_id,
        'title', 'New Booking! 📅',
        'body', NEW.customer_name || ' has booked ' || service_name || ' for ' || booking_datetime,
        'data', jsonb_build_object('type', 'new_booking', 'bookingId', NEW.id)
      )
    );
  END IF;
  
  -- Insert notification log for completed bookings
  IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Get merchant shop name
    SELECT m.shop_name INTO merchant_name
    FROM merchants m
    WHERE m.id = NEW.merchant_id;
    
    customer_user_id := NEW.user_id;
    
    -- Insert notification log for customer
    INSERT INTO notification_logs (user_id, title, body, type)
    VALUES (
      customer_user_id,
      'How was your visit? ⭐',
      'Hope you enjoyed your service at ' || merchant_name || '! Tap to leave a review.',
      'review_request'
    );
    
    -- Trigger actual notification via Edge Function
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'userId', customer_user_id,
        'title', 'How was your visit? ⭐',
        'body', 'Hope you enjoyed your service at ' || merchant_name || '! Tap to leave a review.',
        'data', jsonb_build_object('type', 'review_request', 'bookingId', NEW.id)
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for booking notifications
DROP TRIGGER IF EXISTS booking_notification_trigger ON bookings;
CREATE TRIGGER booking_notification_trigger
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_booking_notification();

-- Create function for weekly reminder notifications (to be called by a cron job)
CREATE OR REPLACE FUNCTION send_weekly_reminders()
RETURNS void AS $$
DECLARE
  customer_record RECORD;
BEGIN
  -- Find customers who haven't booked in the last 7 days
  FOR customer_record IN
    SELECT DISTINCT p.id, p.name
    FROM profiles p
    WHERE p.role = 'customer'
    AND p.notification_enabled = true
    AND p.fcm_token IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.user_id = p.id
      AND b.created_at > NOW() - INTERVAL '7 days'
    )
  LOOP
    -- Insert notification log
    INSERT INTO notification_logs (user_id, title, body, type)
    VALUES (
      customer_record.id,
      'Your salon awaits! 💇‍♀️✨',
      'Book your next appointment and look fabulous!',
      'weekly_reminder'
    );
    
    -- Trigger actual notification via Edge Function
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'userId', customer_record.id,
        'title', 'Your salon awaits! 💇‍♀️✨',
        'body', 'Book your next appointment and look fabulous!',
        'data', jsonb_build_object('type', 'weekly_reminder')
      )
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
