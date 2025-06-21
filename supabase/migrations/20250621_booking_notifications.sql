
-- Function to handle booking notifications
CREATE OR REPLACE FUNCTION handle_booking_notifications()
RETURNS TRIGGER AS $$
DECLARE
  merchant_user_id UUID;
  merchant_name TEXT;
  service_name TEXT;
BEGIN
  -- Handle new booking (INSERT)
  IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
    -- Get merchant details
    SELECT m.user_id, m.shop_name INTO merchant_user_id, merchant_name
    FROM merchants m
    WHERE m.id = NEW.merchant_id;
    
    -- Get service name
    SELECT s.name INTO service_name
    FROM services s
    WHERE s.id = NEW.service_id;
    
    -- Send notification to merchant about new booking
    PERFORM net.http_post(
      url := 'http://localhost:54321/functions/v1/send-notification',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.supabase_service_role_key', true) || '"}'::jsonb,
      body := jsonb_build_object(
        'userId', merchant_user_id,
        'title', 'New Booking! 📅',
        'body', COALESCE(NEW.customer_name, 'Customer') || ' has booked ' || COALESCE(service_name, 'service') || ' for ' || NEW.date || ' at ' || NEW.time_slot,
        'data', jsonb_build_object(
          'type', 'new_booking',
          'bookingId', NEW.id
        )
      )
    );
    
    -- Send confirmation to customer
    PERFORM net.http_post(
      url := 'http://localhost:54321/functions/v1/send-notification',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.supabase_service_role_key', true) || '"}'::jsonb,
      body := jsonb_build_object(
        'userId', NEW.user_id,
        'title', '🎉 Booking Confirmed!',
        'body', 'Your appointment at ' || COALESCE(merchant_name, 'the salon') || ' for ' || COALESCE(service_name, 'service') || ' on ' || NEW.date || ' at ' || NEW.time_slot || ' is confirmed!',
        'data', jsonb_build_object(
          'type', 'booking_confirmed',
          'bookingId', NEW.id
        )
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for booking notifications
DROP TRIGGER IF EXISTS booking_notifications_trigger ON bookings;
CREATE TRIGGER booking_notifications_trigger
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION handle_booking_notifications();
