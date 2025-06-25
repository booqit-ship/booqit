
-- Complete fix for notification trigger to prevent null body constraint violations
CREATE OR REPLACE FUNCTION public.trigger_automatic_notifications()
RETURNS TRIGGER AS $$
DECLARE
  merchant_user_id UUID;
  customer_name TEXT;
  merchant_name TEXT;
  service_name TEXT;
  formatted_datetime TEXT;
  booking_datetime TIMESTAMP;
  notification_title TEXT;
  notification_body TEXT;
BEGIN
  -- Skip notification creation if any critical data is missing
  IF TG_OP = 'INSERT' THEN
    -- New booking → notify merchant (works for both guest and user bookings)
    SELECT m.user_id, m.shop_name INTO merchant_user_id, merchant_name
      FROM merchants m
      WHERE m.id = NEW.merchant_id;

    -- Skip if no merchant found
    IF merchant_user_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Get service name with fallback
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

    -- Format datetime consistently with robust error handling
    BEGIN
      booking_datetime := NEW.date::timestamp + NEW.time_slot::interval;
      formatted_datetime := to_char(booking_datetime, 'Mon DD, YYYY') || ' at ' || 
                           to_char(booking_datetime, 'HH12:MI AM');
    EXCEPTION WHEN OTHERS THEN
      -- If datetime parsing fails, create a safe fallback
      formatted_datetime := COALESCE(NEW.date::text, 'Unknown Date') || ' at ' || COALESCE(NEW.time_slot, 'Unknown Time');
    END;

    -- Create notification with guaranteed non-null values
    notification_title := '📅 New Booking!';
    notification_body := COALESCE(customer_name, 'A customer') || ' has booked ' || 
                        COALESCE(service_name, 'a service') || ' for ' || 
                        COALESCE(formatted_datetime, 'scheduled appointment');

    -- Final safety check - only insert if we have valid, non-empty values
    IF notification_title IS NOT NULL AND notification_body IS NOT NULL AND 
       trim(notification_title) != '' AND trim(notification_body) != '' THEN
      INSERT INTO notification_logs (user_id, title, body, type)
        VALUES (
          merchant_user_id,
          notification_title,
          notification_body,
          'new_booking'
        );
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Only process status changes
    IF NEW.status IS NULL OR OLD.status IS NULL OR NEW.status = OLD.status THEN
      RETURN NEW;
    END IF;

    -- Get customer name for updates with fallback
    customer_name := COALESCE(NEW.customer_name, 'Customer');
    
    -- Format datetime for updates with robust error handling
    BEGIN
      booking_datetime := NEW.date::timestamp + NEW.time_slot::interval;
      formatted_datetime := to_char(booking_datetime, 'Mon DD, YYYY') || ' at ' || 
                           to_char(booking_datetime, 'HH12:MI AM');
    EXCEPTION WHEN OTHERS THEN
      formatted_datetime := COALESCE(NEW.date::text, 'Unknown Date') || ' at ' || COALESCE(NEW.time_slot, 'Unknown Time');
    END;

    -- Booking status changes: confirmed, completed, cancelled
    IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
      -- Only notify authenticated users (not guest users)
      IF NEW.user_id IS NOT NULL THEN
        SELECT m.shop_name INTO merchant_name FROM merchants m WHERE m.id = NEW.merchant_id;
        SELECT s.name INTO service_name FROM services s WHERE s.id = NEW.service_id;
        
        notification_title := '🎉 Booking Confirmed!';
        notification_body := 'Your appointment at ' || COALESCE(merchant_name, 'the salon') || 
          ' for ' || COALESCE(service_name, 'service') || ' on ' || COALESCE(formatted_datetime, 'scheduled time') || ' is confirmed!';
        
        -- Safety check before insert
        IF notification_title IS NOT NULL AND notification_body IS NOT NULL AND 
           trim(notification_title) != '' AND trim(notification_body) != '' THEN
          INSERT INTO notification_logs (user_id, title, body, type)
            VALUES (
              NEW.user_id,
              notification_title,
              notification_body,
              'booking_confirmed'
            );
        END IF;
      END IF;
      
    ELSIF NEW.status = 'completed' AND OLD.status != 'completed' THEN
      -- Request review - only for authenticated users
      IF NEW.user_id IS NOT NULL THEN
        SELECT shop_name INTO merchant_name FROM merchants WHERE id = NEW.merchant_id;
        
        notification_title := '⭐ How was your visit?';
        notification_body := 'Hope you enjoyed your service at ' || COALESCE(merchant_name, 'the salon') || 
          '! Tap to leave a review.';
        
        -- Safety check before insert
        IF notification_title IS NOT NULL AND notification_body IS NOT NULL AND 
           trim(notification_title) != '' AND trim(notification_body) != '' THEN
          INSERT INTO notification_logs (user_id, title, body, type)
            VALUES (NEW.user_id,
              notification_title,
              notification_body,
              'booking_completed'
            );
        END IF;
      END IF;
      
    ELSIF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
      -- Get merchant info
      SELECT m.user_id, m.shop_name INTO merchant_user_id, merchant_name
        FROM merchants m
        WHERE m.id = NEW.merchant_id;

      -- Notify merchant with safe values
      IF merchant_user_id IS NOT NULL THEN
        notification_title := '❌ Booking Cancelled';
        notification_body := COALESCE(customer_name, 'A customer') || ' has cancelled their appointment for ' || 
          COALESCE(formatted_datetime, 'scheduled appointment');
        
        -- Safety check before insert
        IF notification_title IS NOT NULL AND notification_body IS NOT NULL AND 
           trim(notification_title) != '' AND trim(notification_body) != '' THEN
          INSERT INTO notification_logs (user_id, title, body, type)
            VALUES (
              merchant_user_id,
              notification_title,
              notification_body,
              'booking_cancelled'
            );
        END IF;
      END IF;
      
      -- Notify customer only if it's an authenticated user
      IF NEW.user_id IS NOT NULL THEN
        notification_title := '❌ Booking Cancelled';
        notification_body := 'Your appointment at ' || COALESCE(merchant_name, 'the salon') || 
          ' for ' || COALESCE(formatted_datetime, 'scheduled appointment') || ' has been cancelled.';
        
        -- Safety check before insert
        IF notification_title IS NOT NULL AND notification_body IS NOT NULL AND 
           trim(notification_title) != '' AND trim(notification_body) != '' THEN
          INSERT INTO notification_logs (user_id, title, body, type)
            VALUES (
              NEW.user_id,
              notification_title,
              notification_body,
              'booking_cancelled'
            );
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- If anything fails in notification creation, log the error but don't fail the booking operation
  RAISE WARNING 'Notification trigger failed for booking %, error: %', COALESCE(NEW.id, OLD.id), SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also ensure the booking reminder function is completely null-safe
CREATE OR REPLACE FUNCTION public.schedule_booking_reminder()
RETURNS TRIGGER AS $$
DECLARE
  cust_id UUID;
  book_time TIMESTAMP;
  reminder_body TEXT;
BEGIN
  -- Only schedule reminders for authenticated users (not guest bookings)
  IF NEW.status = 'confirmed' AND NEW.user_id IS NOT NULL THEN
    cust_id := NEW.user_id;
    
    BEGIN
      book_time := NEW.date::timestamp + NEW.time_slot::interval;
      
      IF book_time > now() + INTERVAL '25 hours' THEN -- Only for bookings >24h away
        reminder_body := 'You have a booking tomorrow at ' || to_char(book_time, 'HH12:MI AM, Mon DD');
        
        -- Ensure reminder_body is not null and not empty
        IF reminder_body IS NOT NULL AND trim(reminder_body) != '' THEN
          INSERT INTO notification_queue (user_id, scheduled_at, title, body, type, data)
          VALUES (
            cust_id,
            book_time - INTERVAL '24 hours',
            'Upcoming Appointment Reminder',
            reminder_body,
            'upcoming_appointment',
            jsonb_build_object('booking_id', NEW.id)
          );
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- If datetime parsing fails, skip reminder creation
      RAISE WARNING 'Failed to schedule reminder for booking %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the booking operation if reminder scheduling fails
  RAISE WARNING 'Reminder scheduling failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
