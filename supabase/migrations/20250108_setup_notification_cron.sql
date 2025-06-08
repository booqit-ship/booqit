
-- Enable the required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to run reminder notifications every minute
SELECT cron.schedule(
  'send-reminder-notifications',
  '* * * * *', -- Every minute
  $$
  SELECT
    net.http_post(
      url := 'https://ggclvurfcykbwmhfftkn.supabase.co/functions/v1/send-reminders',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnY2x2dXJmY3lrYndtaGZmdGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3MTQ3OTUsImV4cCI6MjA2MzI5MDc5NX0.0lpqHKUCWh47YTnRuksWDmv6Y5JPEanMwVyoQy9zeHw"}'::jsonb,
      body := '{"automated": true}'::jsonb
    ) as request_id;
  $$
);

-- Create a trigger function to send new booking notifications
CREATE OR REPLACE FUNCTION notify_new_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- Send notification for all new bookings (not just confirmed ones)
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed')) THEN
    -- Log the trigger activation
    RAISE LOG 'Booking notification trigger activated for booking ID: %', NEW.id;
    
    -- Call the edge function to send notification
    PERFORM
      net.http_post(
        url := 'https://ggclvurfcykbwmhfftkn.supabase.co/functions/v1/send-booking-notification',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnY2x2dXJmY3lrYndtaGZmdGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3MTQ3OTUsImV4cCI6MjA2MzI5MDc5NX0.0lpqHKUCWh47YTnRuksWDmv6Y5JPEanMwVyoQy9zeHw"}'::jsonb,
        body := json_build_object(
          'bookingId', NEW.id::text,
          'merchantUserId', (SELECT user_id::text FROM merchants WHERE id = NEW.merchant_id),
          'customerName', COALESCE(NEW.customer_name, 'Unknown Customer'),
          'serviceName', COALESCE((SELECT name FROM services WHERE id = NEW.service_id), 'Service'),
          'dateTime', COALESCE(NEW.date::text, '') || ' at ' || COALESCE(NEW.time_slot, ''),
          'automated', false
        )::jsonb
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS booking_notification_trigger ON bookings;
CREATE TRIGGER booking_notification_trigger
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_booking();

-- Test the notification system by creating a test function
CREATE OR REPLACE FUNCTION test_booking_notification(test_merchant_user_id text)
RETURNS void AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://ggclvurfcykbwmhfftkn.supabase.co/functions/v1/send-booking-notification',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnY2x2dXJmY3lrYndtaGZmdGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3MTQ3OTUsImV4cCI6MjA2MzI5MDc5NX0.0lpqHKUCWh47YTnRuksWDmv6Y5JPEanMwVyoQy9zeHw"}'::jsonb,
      body := json_build_object(
        'bookingId', 'test-123',
        'merchantUserId', test_merchant_user_id,
        'customerName', 'Test Customer',
        'serviceName', 'Test Service',
        'dateTime', 'Today at 3:00 PM',
        'automated', false
      )::jsonb
    );
END;
$$ LANGUAGE plpgsql;
