-- Create rate limit tracking table
CREATE TABLE public.rate_limit_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  function_name text NOT NULL,
  call_date date NOT NULL DEFAULT CURRENT_DATE,
  call_count integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, function_name, call_date)
);

-- Enable RLS
ALTER TABLE public.rate_limit_tracking ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rate limit data
CREATE POLICY "Users can view own rate limits"
ON public.rate_limit_tracking
FOR SELECT
USING (user_id = auth.uid());

-- Create rate limit check function
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_user_id uuid,
  p_function_name text,
  p_daily_limit integer DEFAULT 50
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
BEGIN
  -- Try to insert or get current count
  INSERT INTO rate_limit_tracking (user_id, function_name, call_date, call_count)
  VALUES (p_user_id, p_function_name, CURRENT_DATE, 1)
  ON CONFLICT (user_id, function_name, call_date)
  DO UPDATE SET call_count = rate_limit_tracking.call_count + 1
  RETURNING call_count INTO current_count;
  
  -- Check if within limit
  IF current_count <= p_daily_limit THEN
    RETURN true;
  ELSE
    -- Rollback the increment if over limit
    UPDATE rate_limit_tracking
    SET call_count = call_count - 1
    WHERE user_id = p_user_id 
      AND function_name = p_function_name 
      AND call_date = CURRENT_DATE;
    RETURN false;
  END IF;
END;
$$;

-- Function to get remaining calls for a user
CREATE OR REPLACE FUNCTION public.get_remaining_calls(
  p_user_id uuid,
  p_function_name text,
  p_daily_limit integer DEFAULT 50
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_daily_limit - COALESCE(
    (SELECT call_count FROM rate_limit_tracking 
     WHERE user_id = p_user_id 
       AND function_name = p_function_name 
       AND call_date = CURRENT_DATE),
    0
  );
$$;