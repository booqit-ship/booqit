
-- Simplify notification system RLS policies
-- Remove dependency on profiles table for notifications

-- First, clean up notification_settings policies completely
DROP POLICY IF EXISTS "Service role full access to notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Users can manage their own notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Authenticated users can read notification settings for notifications" ON public.notification_settings;
DROP POLICY IF EXISTS "Allow service role full access to notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Allow users to manage their own notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Allow authenticated users to read all notification settings" ON public.notification_settings;

-- Create simple, effective policies for notification_settings
-- Service role (edge functions) can do everything
CREATE POLICY "Service role full access notification_settings"
    ON public.notification_settings
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Users can manage their own settings
CREATE POLICY "Users manage own notification_settings"
    ON public.notification_settings
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- CRITICAL: Allow ANY authenticated user to read notification_settings
-- This is what enables merchant-to-customer and customer-to-merchant notifications
CREATE POLICY "Authenticated users read notification_settings"
    ON public.notification_settings
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Now restrict profiles table to own access only for better privacy
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read profiles for notifications" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read all profiles for notifications" ON public.profiles;

-- Profiles table: strict privacy - only own access + service role
CREATE POLICY "Service role full access profiles"
    ON public.profiles
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users own profile access only"
    ON public.profiles
    FOR ALL
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
