
-- API Keys table for secure key management
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Unnamed Key',
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  scopes TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
  request_count_current_window INTEGER NOT NULL DEFAULT 0,
  window_start_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast hash lookups during auth
CREATE UNIQUE INDEX idx_api_keys_key_hash ON public.api_keys (key_hash);
-- Index for user lookups
CREATE INDEX idx_api_keys_user_id ON public.api_keys (user_id);
-- Index for prefix lookups
CREATE INDEX idx_api_keys_key_prefix ON public.api_keys (key_prefix);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Users can view their own keys
CREATE POLICY "Users can view their own API keys"
ON public.api_keys FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own keys
CREATE POLICY "Users can insert their own API keys"
ON public.api_keys FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own keys (revoke, rename)
CREATE POLICY "Users can update their own API keys"
ON public.api_keys FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own keys
CREATE POLICY "Users can delete their own API keys"
ON public.api_keys FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_api_keys_updated_at
BEFORE UPDATE ON public.api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to validate API key (called from edge functions, bypasses RLS)
CREATE OR REPLACE FUNCTION public.validate_api_key(p_key_hash TEXT)
RETURNS TABLE(
  key_id UUID,
  owner_user_id UUID,
  key_scopes TEXT[],
  key_rate_limit INTEGER,
  key_request_count INTEGER,
  key_window_start TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    user_id,
    scopes,
    rate_limit_per_minute,
    request_count_current_window,
    window_start_at
  FROM public.api_keys
  WHERE key_hash = p_key_hash
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());
$$;

-- Function to update rate limit counters and last_used_at
CREATE OR REPLACE FUNCTION public.increment_api_key_usage(p_key_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_request_count INTEGER;
  v_rate_limit INTEGER;
BEGIN
  SELECT window_start_at, request_count_current_window, rate_limit_per_minute
  INTO v_window_start, v_request_count, v_rate_limit
  FROM public.api_keys WHERE id = p_key_id;

  -- Reset window if more than 1 minute has passed
  IF now() - v_window_start > interval '1 minute' THEN
    UPDATE public.api_keys
    SET request_count_current_window = 1,
        window_start_at = now(),
        last_used_at = now()
    WHERE id = p_key_id;
    RETURN true;
  END IF;

  -- Check rate limit
  IF v_request_count >= v_rate_limit THEN
    RETURN false;
  END IF;

  -- Increment counter
  UPDATE public.api_keys
  SET request_count_current_window = request_count_current_window + 1,
      last_used_at = now()
  WHERE id = p_key_id;
  RETURN true;
END;
$$;
