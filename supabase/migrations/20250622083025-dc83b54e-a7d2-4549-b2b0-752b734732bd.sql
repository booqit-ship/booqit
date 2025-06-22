
-- First, check what policies exist by dropping them more comprehensively
DROP POLICY IF EXISTS "Service role full access notification_settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Users manage own notification_settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Service role full access notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Users can manage own notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Authenticated users can create notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Authenticated users can read own notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Authenticated users can update own notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Service role full access to notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Users can manage their own notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Authenticated users can read notification settings for notifications" ON public.notification_settings;
DROP POLICY IF EXISTS "Authenticated users read notification_settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Service role can read all notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Service role can update all notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Service role can insert notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Users can read own notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Users can update own notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Users can insert own notification settings" ON public.notification_settings;

-- Now create the simplified policies with unique names
CREATE POLICY "notification_settings_service_role_access"
    ON public.notification_settings
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "notification_settings_user_own_access"
    ON public.notification_settings
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
