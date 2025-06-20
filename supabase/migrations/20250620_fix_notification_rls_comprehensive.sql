
-- Fix RLS policies for notification system

-- First, fix notification_settings table policies
DROP POLICY IF EXISTS "Service role full access notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Users can manage own notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Authenticated users can create notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Authenticated users can read own notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Authenticated users can update own notification settings" ON public.notification_settings;

-- Create comprehensive policies for notification_settings
CREATE POLICY "Service role full access to notification settings"
    ON public.notification_settings
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Allow users to manage their own notification settings
CREATE POLICY "Users can manage their own notification settings"
    ON public.notification_settings
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Allow any authenticated user to read notification settings for sending notifications
-- This is needed for cross-user notifications (merchant to customer, etc.)
CREATE POLICY "Authenticated users can read notification settings for notifications"
    ON public.notification_settings
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Now fix profiles table policies to allow reading for notification purposes
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Recreate profiles policies with notification support
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT 
    USING (auth.uid() = id);

-- Allow any authenticated user to read basic profile info for notifications
-- This includes fcm_token and notification_enabled fields
CREATE POLICY "Authenticated users can read profiles for notifications" ON public.profiles
    FOR SELECT 
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Service role needs full access to profiles for notification fallback
CREATE POLICY "Service role full access to profiles"
    ON public.profiles
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
