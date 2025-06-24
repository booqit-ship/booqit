
-- Fix the booking notifications trigger with correct Supabase URL
CREATE OR REPLACE FUNCTION handle_booking_notifications()
RETURNS TRIGGER AS $$
DECLARE
  merchant_user_id UUID;
  merchant_name TEXT;
  service_name TEXT;
  notification_url TEXT;
BEGIN
  -- Use the correct hardcoded Supabase edge function URL
  notification_url := 'https://ggclvurfcykbwmhfftkn.supabase.co/functions/v1/send-notification';
  
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
    IF merchant_user_id IS NOT NULL THEN
      PERFORM net.http_post(
        url := notification_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json', 
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
        ),
        body := jsonb_build_object(
          'userId', merchant_user_id,
          'title', '📅 New Booking!',
          'body', COALESCE(NEW.customer_name, 'Customer') || ' has booked ' || COALESCE(service_name, 'service') || ' for ' || NEW.date || ' at ' || NEW.time_slot,
          'data', jsonb_build_object(
            'type', 'new_booking',
            'bookingId', NEW.id
          )
        )
      );
    END IF;
    
    -- Send confirmation to customer (only for authenticated users)
    IF NEW.user_id IS NOT NULL THEN
      PERFORM net.http_post(
        url := notification_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json', 
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
        ),
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
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger for booking notifications
DROP TRIGGER IF EXISTS booking_notifications_trigger ON bookings;
CREATE TRIGGER booking_notifications_trigger
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION handle_booking_notifications();

-- Add better logging to device_tokens table
ALTER TABLE device_tokens 
ADD COLUMN IF NOT EXISTS debug_info JSONB DEFAULT NULL;

-- Function to debug device token issues
CREATE OR REPLACE FUNCTION debug_device_tokens(p_user_id UUID)
RETURNS TABLE(
  user_id UUID,
  fcm_token TEXT,
  device_type TEXT,
  device_name TEXT,
  is_active BOOLEAN,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dt.user_id,
    LEFT(dt.fcm_token, 30) || '...' as fcm_token,
    dt.device_type,
    dt.device_name,
    dt.is_active,
    dt.last_used_at,
    dt.created_at
  FROM device_tokens dt
  WHERE dt.user_id = p_user_id
  ORDER BY dt.created_at DESC;
END;
$$;
