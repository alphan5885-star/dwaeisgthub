-- 1) Tighten security_logs INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert logs" ON public.security_logs;
CREATE POLICY "Users insert own login logs"
ON public.security_logs FOR INSERT TO authenticated
WITH CHECK (
  user_email IS NOT NULL
  AND user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- 2) Rate limit infrastructure
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  action text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON public.rate_limits (identifier, action, window_start DESC);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No client policies — accessible only via SECURITY DEFINER functions

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _identifier text,
  _action text,
  _max_count integer,
  _window_seconds integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  current_count integer;
  window_starts timestamptz;
BEGIN
  window_starts := now() - make_interval(secs => _window_seconds);
  -- cleanup old rows opportunistically
  DELETE FROM public.rate_limits WHERE created_at < now() - interval '1 day';

  SELECT COALESCE(SUM(count), 0) INTO current_count
  FROM public.rate_limits
  WHERE identifier = _identifier AND action = _action AND window_start >= window_starts;

  IF current_count >= _max_count THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'current', current_count,
      'max', _max_count,
      'retry_after_seconds', _window_seconds
    );
  END IF;

  INSERT INTO public.rate_limits (identifier, action, count, window_start)
  VALUES (_identifier, _action, 1, now());

  RETURN jsonb_build_object('allowed', true, 'current', current_count + 1, 'max', _max_count);
END;
$$;

-- 3) Account lockout after failed logins
CREATE TABLE IF NOT EXISTS public.account_lockouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  failed_count integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  last_attempt timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.account_lockouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read lockouts"
ON public.account_lockouts FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.is_account_locked(_email text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  rec public.account_lockouts;
BEGIN
  SELECT * INTO rec FROM public.account_lockouts WHERE email = lower(_email);
  IF rec.locked_until IS NOT NULL AND rec.locked_until > now() THEN
    RETURN jsonb_build_object(
      'locked', true,
      'until', rec.locked_until,
      'seconds_remaining', GREATEST(0, EXTRACT(EPOCH FROM (rec.locked_until - now()))::int)
    );
  END IF;
  RETURN jsonb_build_object('locked', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_login_attempt(_email text, _success boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  rec public.account_lockouts;
  new_count integer;
  lock_until timestamptz := NULL;
BEGIN
  SELECT * INTO rec FROM public.account_lockouts WHERE email = lower(_email);

  IF _success THEN
    -- reset on success
    IF FOUND THEN
      UPDATE public.account_lockouts
      SET failed_count = 0, locked_until = NULL, last_attempt = now(), updated_at = now()
      WHERE email = lower(_email);
    END IF;
    RETURN jsonb_build_object('locked', false, 'failed_count', 0);
  END IF;

  -- failed attempt
  IF NOT FOUND THEN
    INSERT INTO public.account_lockouts (email, failed_count, last_attempt)
    VALUES (lower(_email), 1, now())
    RETURNING failed_count INTO new_count;
  ELSE
    new_count := rec.failed_count + 1;
    IF new_count >= 5 THEN
      lock_until := now() + interval '15 minutes';
      new_count := 0; -- reset counter when locking
    END IF;
    UPDATE public.account_lockouts
    SET failed_count = new_count,
        locked_until = COALESCE(lock_until, locked_until),
        last_attempt = now(),
        updated_at = now()
    WHERE email = lower(_email);
  END IF;

  RETURN jsonb_build_object(
    'locked', lock_until IS NOT NULL,
    'failed_count', new_count,
    'until', lock_until
  );
END;
$$;