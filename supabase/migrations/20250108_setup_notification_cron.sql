
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
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnY2x2dXJmY3lrYndtaGZmdGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3MTQ3OTUsImV4cCI6MjA2MzI5MDc5NX0.0lpqHKUCWh47YTnRuksWDmv6Y5JPEanMwVyoQy9zeHw"}'::jsonb,
      body := '{"automated": true}'::jsonb
    ) as request_id;
  $$
);

-- Drop existing trigger and function to recreate them
DROP TRIGGER IF EXISTS booking_notification_trigger ON bookings;
DROP FUNCTION IF EXISTS notify_new_booking();

-- Create a robust trigger function to send new booking notifications
CREATE OR REPLACE FUNCTION notify_new_booking()
RETURNS TRIGGER AS $$
DECLARE
  merchant_user_id_val uuid;
  customer_name_val text;
  service_name_val text;
  staff_name_val text;
  date_time_val text;
BEGIN
  -- Only send notifications for new bookings (INSERT) or when status changes to confirmed
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed')) THEN
    
    -- Get merchant user ID
    SELECT m.user_id INTO merchant_user_id_val
    FROM merchants m 
    WHERE m.id = NEW.merchant_id;
    
    -- Get service name
    SELECT s.name INTO service_name_val
    FROM services s 
    WHERE s.id = NEW.service_id;
    
    -- Get staff name
    SELECT st.name INTO staff_name_val
    FROM staff st 
    WHERE st.id = NEW.staff_id;
    
    -- Construct date time string
    date_time_val := COALESCE(NEW.date::text, '') || ' at ' || COALESCE(NEW.time_slot, '');
    
    -- Set default values for missing data
    customer_name_val := COALESCE(NEW.customer_name, 'Unknown Customer');
    service_name_val := COALESCE(service_name_val, 'Service');
    staff_name_val := COALESCE(staff_name_val, NEW.stylist_name, 'Staff Member');
    
    -- Log the trigger activation with all details
    RAISE LOG 'BOOKING NOTIFICATION: Trigger fired for booking %, merchant user %, customer %, service %, staff %, datetime %', 
      NEW.id, merchant_user_id_val, customer_name_val, service_name_val, staff_name_val, date_time_val;
    
    -- Only proceed if we have a valid merchant user ID
    IF merchant_user_id_val IS NOT NULL THEN
      -- Call the edge function to send notification
      PERFORM
        net.http_post(
          url := 'https://ggclvurfcykbwmhfftkn.supabase.co/functions/v1/send-booking-notification',
          headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnY2x2dXJmY3lrYndtaGZmdGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3MTQ3OTUsImV4cCI6MjA2MzI5MDc5NX0.0lpqHKUCWh47YTnRuksWDmv6Y5JPEanMwVyoQy9zeHw"}'::jsonb,
          body := json_build_object(
            'bookingId', NEW.id::text,
            'merchantUserId', merchant_user_id_val::text,
            'customerName', customer_name_val,
            'serviceName', service_name_val,
            'dateTime', date_time_val,
            'staffName', staff_name_val,
            'automated', false
          )::jsonb
        );
        
      RAISE LOG 'BOOKING NOTIFICATION: HTTP request sent for booking %, merchant user %', NEW.id, merchant_user_id_val;
    ELSE
      RAISE LOG 'BOOKING NOTIFICATION: No merchant user ID found for merchant %, skipping notification', NEW.merchant_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER booking_notification_trigger
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_booking();

-- Create a test function for manual testing
CREATE OR REPLACE FUNCTION test_booking_notification(test_merchant_user_id text)
RETURNS void AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://ggclvurfcykbwmhfftkn.supabase.co/functions/v1/send-booking-notification',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnY2x2dXJmY3lrYndtaGZmdGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3MTQ3OTUsImV4cCI6MjA2MzI5MDc5NX0.0lpqHKUCWh47YTnRuksWDmv6Y5JPEanMwVyoQy9zeHw"}'::jsonb,
      body := json_build_object(
        'bookingId', 'test-' || extract(epoch from now())::text,
        'merchantUserId', test_merchant_user_id,
        'customerName', 'Test Customer',
        'serviceName', 'Test Service',
        'dateTime', 'Today at ' || to_char(now(), 'HH24:MI'),
        'staffName', 'Test Stylist',
        'automated', false
      )::jsonb
    );
    
  RAISE NOTICE 'Test notification sent to merchant user: %', test_merchant_user_id;
END;
$$ LANGUAGE plpgsql;

-- Enable detailed logging for debugging
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA net TO postgres;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA net TO postgres;
