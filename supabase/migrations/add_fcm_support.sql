
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
BEGIN
  -- Insert notification log for new bookings
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notification_logs (user_id, title, body, type)
    VALUES (
      (SELECT merchant_id FROM services WHERE id = NEW.service_id),
      'New Booking!',
      'You have received a new booking',
      'new_booking'
    );
  END IF;
  
  -- Insert notification log for completed bookings
  IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO notification_logs (user_id, title, body, type)
    VALUES (
      NEW.customer_id,
      'How was your visit?',
      'Please leave a review for your recent service',
      'review_request'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for booking notifications
DROP TRIGGER IF EXISTS booking_notification_trigger ON bookings;
CREATE TRIGGER booking_notification_trigger
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_booking_notification();
