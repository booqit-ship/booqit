
-- Create device_tokens table for multi-device FCM support
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('web', 'android', 'ios')),
  device_name TEXT,
  user_agent TEXT,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, fcm_token)
);

-- Create indexes for better performance
CREATE INDEX idx_device_tokens_user_id ON public.device_tokens(user_id);
CREATE INDEX idx_device_tokens_active ON public.device_tokens(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_device_tokens_fcm_token ON public.device_tokens(fcm_token);

-- Enable RLS
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for device_tokens
CREATE POLICY "Users can read own device tokens"
  ON public.device_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own device tokens"
  ON public.device_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own device tokens"
  ON public.device_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own device tokens"
  ON public.device_tokens FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all device tokens"
  ON public.device_tokens FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_device_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_device_tokens_updated_at
  BEFORE UPDATE ON public.device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_device_tokens_updated_at();

-- Function to register or update device token
CREATE OR REPLACE FUNCTION public.register_device_token(
  p_user_id UUID,
  p_fcm_token TEXT,
  p_device_type TEXT,
  p_device_name TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate device type
  IF p_device_type NOT IN ('web', 'android', 'ios') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid device type');
  END IF;

  -- Insert or update device token
  INSERT INTO public.device_tokens (
    user_id, fcm_token, device_type, device_name, user_agent, last_used_at, is_active
  ) VALUES (
    p_user_id, p_fcm_token, p_device_type, p_device_name, p_user_agent, NOW(), true
  )
  ON CONFLICT (user_id, fcm_token) 
  DO UPDATE SET
    device_type = EXCLUDED.device_type,
    device_name = EXCLUDED.device_name,
    user_agent = EXCLUDED.user_agent,
    last_used_at = NOW(),
    is_active = true,
    updated_at = NOW();

  -- Also update the legacy notification_settings table for backward compatibility
  INSERT INTO public.notification_settings (
    user_id, fcm_token, notification_enabled
  ) VALUES (
    p_user_id, p_fcm_token, true
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    fcm_token = EXCLUDED.fcm_token,
    updated_at = NOW();

  RETURN json_build_object('success', true, 'message', 'Device token registered successfully');
END;
$$;

-- Function to get all active device tokens for a user
CREATE OR REPLACE FUNCTION public.get_user_device_tokens(p_user_id UUID)
RETURNS TABLE(fcm_token TEXT, device_type TEXT, device_name TEXT, last_used_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT dt.fcm_token, dt.device_type, dt.device_name, dt.last_used_at
  FROM public.device_tokens dt
  WHERE dt.user_id = p_user_id 
    AND dt.is_active = true
  ORDER BY dt.last_used_at DESC;
END;
$$;

-- Function to deactivate old/unused tokens (cleanup)
CREATE OR REPLACE FUNCTION public.cleanup_inactive_tokens()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deactivated_count INTEGER;
BEGIN
  -- Mark tokens as inactive if not used for 30 days
  UPDATE public.device_tokens 
  SET is_active = false, updated_at = NOW()
  WHERE last_used_at < NOW() - INTERVAL '30 days' 
    AND is_active = true;
  
  GET DIAGNOSTICS deactivated_count = ROW_COUNT;
  
  RETURN json_build_object(
    'success', true, 
    'message', 'Cleanup completed',
    'deactivated_count', deactivated_count
  );
END;
$$;
