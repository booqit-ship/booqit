
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
  request_result record;
BEGIN
  -- Only send notifications for new bookings (INSERT) or when status changes to confirmed
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed')) THEN
    
    RAISE LOG 'BOOKING NOTIFICATION: Processing booking % with status %', NEW.id, NEW.status;
    
    -- Get merchant user ID
    SELECT m.user_id INTO merchant_user_id_val
    FROM merchants m 
    WHERE m.id = NEW.merchant_id;
    
    IF merchant_user_id_val IS NULL THEN
      RAISE LOG 'BOOKING NOTIFICATION: No merchant user ID found for merchant %, skipping notification', NEW.merchant_id;
      RETURN NEW;
    END IF;
    
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
    
    -- Log all details before sending
    RAISE LOG 'BOOKING NOTIFICATION: Sending notification - Booking: %, Merchant User: %, Customer: %, Service: %, Staff: %, DateTime: %', 
      NEW.id, merchant_user_id_val, customer_name_val, service_name_val, staff_name_val, date_time_val;
    
    -- Call the edge function to send notification
    BEGIN
      SELECT INTO request_result
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
        
      RAISE LOG 'BOOKING NOTIFICATION: HTTP request completed for booking %, status: %', NEW.id, request_result.status;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'BOOKING NOTIFICATION: HTTP request failed for booking % - Error: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER booking_notification_trigger
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_booking();

-- Create an improved test function for manual testing
CREATE OR REPLACE FUNCTION test_booking_notification(test_merchant_user_id text)
RETURNS json AS $$
DECLARE
  request_result record;
BEGIN
  RAISE LOG 'TEST NOTIFICATION: Sending test notification to merchant user: %', test_merchant_user_id;
  
  BEGIN
    SELECT INTO request_result
      net.http_post(
        url := 'https://ggclvurfcykbwmhfftkn.supabase.co/functions/v1/send-booking-notification',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnY2x2dXJmY3lrYndtaGZmdGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3MTQ3OTUsImV4cCI6MjA2MzI5MDc5NX0.0lpqHKUCWh47YTnRuksWDmv6Y5JPEanMwVyoQy9zeHw"}'::jsonb,
        body := json_build_object(
          'bookingId', 'test-' || extract(epoch from now())::text,
          'merchantUserId', test_merchant_user_id,
          'customerName', 'Test Customer',
          'serviceName', 'Premium Haircut',
          'dateTime', 'Today at ' || to_char(now(), 'HH24:MI'),
          'staffName', 'Test Stylist',
          'automated', false
        )::jsonb
      );
      
    RAISE NOTICE 'TEST NOTIFICATION: HTTP request completed with status: %', request_result.status;
    
    RETURN json_build_object(
      'success', true,
      'message', 'Test notification sent successfully',
      'merchant_user_id', test_merchant_user_id,
      'request_status', request_result.status
    );
    
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'TEST NOTIFICATION: Failed to send test notification - Error: %', SQLERRM;
    
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'merchant_user_id', test_merchant_user_id
    );
  END;
END;
$$ LANGUAGE plpgsql;

-- Create function to check notification setup
CREATE OR REPLACE FUNCTION check_notification_setup()
RETURNS json AS $$
DECLARE
  trigger_count integer;
  merchant_count integer;
  merchant_with_users integer;
  recent_bookings integer;
BEGIN
  -- Check if trigger exists
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger 
  WHERE tgname = 'booking_notification_trigger';
  
  -- Check merchant data
  SELECT COUNT(*) INTO merchant_count FROM merchants;
  SELECT COUNT(*) INTO merchant_with_users FROM merchants WHERE user_id IS NOT NULL;
  
  -- Check recent bookings
  SELECT COUNT(*) INTO recent_bookings 
  FROM bookings 
  WHERE created_at > now() - INTERVAL '24 hours';
  
  RETURN json_build_object(
    'trigger_exists', trigger_count > 0,
    'total_merchants', merchant_count,
    'merchants_with_user_id', merchant_with_users,
    'recent_bookings_24h', recent_bookings,
    'setup_health', CASE 
      WHEN trigger_count > 0 AND merchant_with_users > 0 THEN 'GOOD'
      WHEN trigger_count = 0 THEN 'MISSING_TRIGGER'
      WHEN merchant_with_users = 0 THEN 'NO_MERCHANT_USER_IDS'
      ELSE 'UNKNOWN'
    END
  );
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA net TO postgres;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA net TO postgres;
