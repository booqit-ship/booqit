
-- Create the notification_settings table
CREATE TABLE public.notification_settings (
    user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    fcm_token text,
    notification_enabled boolean DEFAULT true NOT NULL,
    last_notification_sent timestamp with time zone,
    failed_notification_count integer DEFAULT 0 NOT NULL,
    last_failure_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_notification_settings_enabled ON public.notification_settings(notification_enabled) WHERE notification_enabled = true;
CREATE INDEX idx_notification_settings_fcm_token ON public.notification_settings(fcm_token) WHERE fcm_token IS NOT NULL;

-- Enable RLS on notification_settings
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_settings

-- Service role can read all notification settings (for Edge Functions)
CREATE POLICY "Service role can read all notification settings"
    ON public.notification_settings FOR SELECT
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Service role can update all notification settings (for Edge Functions)
CREATE POLICY "Service role can update all notification settings"
    ON public.notification_settings FOR UPDATE
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Service role can insert notification settings (for backend setup)
CREATE POLICY "Service role can insert notification settings"
    ON public.notification_settings FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Users can read their own notification settings
CREATE POLICY "Users can read own notification settings"
    ON public.notification_settings FOR SELECT
    USING (auth.uid() = user_id);

-- Users can update their own notification settings
CREATE POLICY "Users can update own notification settings"
    ON public.notification_settings FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can insert their own notification settings
CREATE POLICY "Users can insert own notification settings"
    ON public.notification_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notification_settings_updated_at
    BEFORE UPDATE ON public.notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_settings_updated_at();

-- Migrate existing FCM tokens from profiles to notification_settings
INSERT INTO public.notification_settings (user_id, fcm_token, notification_enabled, created_at, updated_at)
SELECT 
    id, 
    fcm_token, 
    COALESCE(notification_enabled, true),
    created_at,
    now()
FROM public.profiles 
WHERE fcm_token IS NOT NULL OR notification_enabled IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET
    fcm_token = EXCLUDED.fcm_token,
    notification_enabled = EXCLUDED.notification_enabled,
    updated_at = now();
