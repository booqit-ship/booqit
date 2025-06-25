
-- Disable the problematic booking notifications trigger that uses the 'net' schema
DROP TRIGGER IF EXISTS booking_notifications_trigger ON bookings;
DROP FUNCTION IF EXISTS handle_booking_notifications();
