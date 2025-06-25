
-- Update the trigger function to fix customer name issues and standardize message templates
CREATE OR REPLACE FUNCTION public.trigger_automatic_notifications()
RETURNS TRIGGER AS $$
DECLARE
  merchant_user_id UUID;
  customer_name TEXT;
  merchant_name TEXT;
  service_name TEXT;
  formatted_datetime TEXT;
  booking_datetime TIMESTAMP;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- New booking → notify merchant (works for both guest and user bookings)
    SELECT m.user_id, m.shop_name INTO merchant_user_id, merchant_name
      FROM merchants m
      WHERE m.id = NEW.merchant_id;

    -- Get service name
    SELECT s.name INTO service_name
      FROM services s
      WHERE s.id = NEW.service_id;

    -- Get correct customer name - prioritize booking record, fallback to profile
    customer_name := COALESCE(NEW.customer_name, 'Customer');
    
    -- If we have user_id but no customer_name, get from profiles
    IF NEW.user_id IS NOT NULL AND (NEW.customer_name IS NULL OR trim(NEW.customer_name) = '') THEN
      SELECT p.name INTO customer_name
        FROM profiles p
        WHERE p.id = NEW.user_id;
      customer_name := COALESCE(customer_name, 'Customer');
    END IF;

    -- Format datetime consistently
    booking_datetime := NEW.date::timestamp + NEW.time_slot::interval;
    formatted_datetime := to_char(booking_datetime, 'Mon DD, YYYY') || ' at ' || 
                         to_char(booking_datetime, 'HH12:MI AM');

    -- Only insert notification log if we have a valid merchant user_id
    IF merchant_user_id IS NOT NULL THEN
      INSERT INTO notification_logs (user_id, title, body, type)
        VALUES (
          merchant_user_id,
          '📅 New Booking!',
          customer_name || ' has booked ' || COALESCE(service_name, 'a service') || 
          ' for ' || formatted_datetime,
          'new_booking'
        );
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Get customer name for updates
    customer_name := COALESCE(NEW.customer_name, 'Customer');
    
    -- Format datetime for updates
    booking_datetime := NEW.date::timestamp + NEW.time_slot::interval;
    formatted_datetime := to_char(booking_datetime, 'Mon DD, YYYY') || ' at ' || 
                         to_char(booking_datetime, 'HH12:MI AM');

    -- Booking status changes: confirmed, completed, cancelled
    IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
      -- Only notify authenticated users (not guest users)
      IF NEW.user_id IS NOT NULL THEN
        SELECT m.shop_name INTO merchant_name FROM merchants m WHERE m.id = NEW.merchant_id;
        SELECT s.name INTO service_name FROM services s WHERE s.id = NEW.service_id;
        
        INSERT INTO notification_logs (user_id, title, body, type)
          VALUES (
            NEW.user_id,
            '🎉 Booking Confirmed!',
            'Your appointment at ' || COALESCE(merchant_name, 'the salon') || 
            ' for ' || COALESCE(service_name, 'service') || ' on ' || formatted_datetime || ' is confirmed!',
            'booking_confirmed'
          );
      END IF;
      
    ELSIF NEW.status = 'completed' AND OLD.status != 'completed' THEN
      -- Request review - only for authenticated users
      IF NEW.user_id IS NOT NULL THEN
        SELECT shop_name INTO merchant_name FROM merchants WHERE id = NEW.merchant_id;
        INSERT INTO notification_logs (user_id, title, body, type)
          VALUES (NEW.user_id,
            '⭐ How was your visit?',
            'Hope you enjoyed your service at ' || COALESCE(merchant_name, 'the salon') || 
            '! Tap to leave a review.',
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
            '❌ Booking Cancelled',
            customer_name || ' has cancelled their appointment for ' || formatted_datetime,
            'booking_cancelled'
          );
      END IF;
      
      -- Notify customer only if it's an authenticated user
      IF NEW.user_id IS NOT NULL THEN
        INSERT INTO notification_logs (user_id, title, body, type)
          VALUES (
            NEW.user_id,
            '❌ Booking Cancelled',
            'Your appointment at ' || COALESCE(merchant_name, 'the salon') || 
            ' for ' || formatted_datetime || ' has been cancelled.',
            'booking_cancelled'
          );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
