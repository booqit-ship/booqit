
-- Enable secure cross-user token access for notifications
-- This allows customers and merchants to fetch each other's tokens for booking-related notifications

-- Drop existing restrictive policies on device_tokens
DROP POLICY IF EXISTS "Users can read own device tokens" ON public.device_tokens;
DROP POLICY IF EXISTS "Users can insert own device tokens" ON public.device_tokens;
DROP POLICY IF EXISTS "Users can update own device tokens" ON public.device_tokens;
DROP POLICY IF EXISTS "Users can delete own device tokens" ON public.device_tokens;
DROP POLICY IF EXISTS "Service role can manage all device tokens" ON public.device_tokens;

-- Create new policies that allow cross-user token access for notifications

-- 1. Users can manage their own tokens (standard)
CREATE POLICY "Users can manage own device tokens"
  ON public.device_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Service role can manage all tokens (for edge functions)
CREATE POLICY "Service role can manage all device tokens"
  ON public.device_tokens
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- 3. Allow cross-user token reading for notification purposes
-- Customers can read merchant tokens for merchants they have bookings with
-- Merchants can read customer tokens for customers who have bookings with them
CREATE POLICY "Cross user token access for notifications"
  ON public.device_tokens
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      -- User can read their own tokens
      auth.uid() = user_id
      OR
      -- Customer can read merchant tokens if they have bookings with that merchant
      EXISTS (
        SELECT 1 FROM public.bookings b
        JOIN public.merchants m ON b.merchant_id = m.id
        WHERE b.user_id = auth.uid()
        AND m.user_id = device_tokens.user_id
      )
      OR
      -- Merchant can read customer tokens if customers have bookings with their merchant
      EXISTS (
        SELECT 1 FROM public.merchants m
        JOIN public.bookings b ON b.merchant_id = m.id
        WHERE m.user_id = auth.uid()
        AND b.user_id = device_tokens.user_id
      )
    )
  );

-- Create function to get all device tokens for notification sending
CREATE OR REPLACE FUNCTION public.get_notification_tokens(p_target_user_id UUID)
RETURNS TABLE(fcm_token TEXT, device_type TEXT, device_name TEXT, last_used_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the caller has permission to send notifications to the target user
  -- Either they are the target user, or they have a booking relationship
  IF NOT (
    auth.uid() = p_target_user_id
    OR EXISTS (
      -- Customer accessing merchant tokens
      SELECT 1 FROM public.bookings b
      JOIN public.merchants m ON b.merchant_id = m.id
      WHERE b.user_id = auth.uid()
      AND m.user_id = p_target_user_id
    )
    OR EXISTS (
      -- Merchant accessing customer tokens
      SELECT 1 FROM public.merchants m
      JOIN public.bookings b ON b.merchant_id = m.id
      WHERE m.user_id = auth.uid()
      AND b.user_id = p_target_user_id
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized access to user tokens';
  END IF;

  RETURN QUERY
  SELECT dt.fcm_token, dt.device_type, dt.device_name, dt.last_used_at
  FROM public.device_tokens dt
  WHERE dt.user_id = p_target_user_id 
    AND dt.is_active = true
  ORDER BY dt.last_used_at DESC;
END;
$$;
