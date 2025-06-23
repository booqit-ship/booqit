
-- Fix notification triggers to handle guest bookings (user_id = NULL)
-- This prevents the "null value in column body" error for guest bookings

-- Update trigger_automatic_notifications function to skip guest bookings for customer notifications
CREATE OR REPLACE FUNCTION public.trigger_automatic_notifications()
RETURNS TRIGGER AS $$
DECLARE
  merchant_user_id UUID;
  customer_name TEXT;
  merchant_name TEXT;
  b_time TIMESTAMP;
  data_payload JSONB;
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
      -- Only notify customer if it's NOT a guest booking (user_id is not NULL)
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
      -- Only request review from authenticated customers (not guests)
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
      -- Notify merchant about cancellation (works for both guest and user bookings)
      SELECT m.user_id, m.shop_name INTO merchant_user_id, merchant_name
        FROM merchants m
        WHERE m.id = NEW.merchant_id;

      customer_name := COALESCE(NEW.customer_name, 'Customer');

      IF merchant_user_id IS NOT NULL THEN
        INSERT INTO notification_logs (user_id, title, body, type)
          VALUES (
            merchant_user_id,
            'Booking Cancelled',
            'A booking by ' || customer_name || ' has been cancelled.',
            'booking_cancelled'
          );
      END IF;

      -- Only notify customer if it's NOT a guest booking
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

-- Update handle_booking_notifications function to handle guest bookings
CREATE OR REPLACE FUNCTION handle_booking_notifications()
RETURNS TRIGGER AS $$
DECLARE
  merchant_user_id UUID;
  merchant_name TEXT;
  service_name TEXT;
  customer_name TEXT;
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
    
    -- Get customer name from booking record (works for both guest and user bookings)
    customer_name := COALESCE(NEW.customer_name, 'Customer');
    
    -- Send notification to merchant about new booking (if merchant user exists)
    IF merchant_user_id IS NOT NULL THEN
      PERFORM net.http_post(
        url := 'http://localhost:54321/functions/v1/send-notification',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.supabase_service_role_key', true) || '"}'::jsonb,
        body := jsonb_build_object(
          'userId', merchant_user_id,
          'title', 'New Booking! 📅',
          'body', customer_name || ' has booked ' || COALESCE(service_name, 'service') || ' for ' || NEW.date || ' at ' || NEW.time_slot,
          'data', jsonb_build_object(
            'type', 'new_booking',
            'bookingId', NEW.id
          )
        )
      );
    END IF;
    
    -- Send confirmation to customer ONLY if it's NOT a guest booking
    IF NEW.user_id IS NOT NULL THEN
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
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
