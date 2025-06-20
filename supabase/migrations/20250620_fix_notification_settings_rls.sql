
-- Fix notification_settings RLS policies

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Service role can read all notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Service role can update all notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Service role can insert notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Users can read own notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Users can update own notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Users can insert own notification settings" ON public.notification_settings;

-- Create new, more permissive policies

-- Allow service role full access (for edge functions)
CREATE POLICY "Service role full access notification settings"
    ON public.notification_settings
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Allow users to manage their own notification settings
CREATE POLICY "Users can manage own notification settings"
    ON public.notification_settings
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to insert their own settings
CREATE POLICY "Authenticated users can create notification settings"
    ON public.notification_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to read their own settings
CREATE POLICY "Authenticated users can read own notification settings"
    ON public.notification_settings FOR SELECT
    USING (auth.uid() = user_id);

-- Allow authenticated users to update their own settings
CREATE POLICY "Authenticated users can update own notification settings"
    ON public.notification_settings FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
