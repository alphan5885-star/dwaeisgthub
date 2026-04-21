
-- Rate limits table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  action text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  UNIQUE (identifier, action)
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON public.rate_limits (identifier, action);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view rate limits" ON public.rate_limits
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action, created_at DESC);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view all audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view own audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (actor_id = auth.uid());

-- Rate limit checker (window = 60 seconds by default)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _identifier text,
  _action text,
  _max_count integer DEFAULT 10,
  _window_seconds integer DEFAULT 60
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.rate_limits%ROWTYPE;
  now_ts timestamptz := now();
BEGIN
  SELECT * INTO rec FROM public.rate_limits
    WHERE identifier = _identifier AND action = _action FOR UPDATE;

  IF rec.id IS NULL THEN
    INSERT INTO public.rate_limits (identifier, action, count, window_start)
      VALUES (_identifier, _action, 1, now_ts);
    RETURN jsonb_build_object('allowed', true, 'remaining', _max_count - 1);
  END IF;

  IF rec.window_start < now_ts - make_interval(secs => _window_seconds) THEN
    UPDATE public.rate_limits SET count = 1, window_start = now_ts
      WHERE id = rec.id;
    RETURN jsonb_build_object('allowed', true, 'remaining', _max_count - 1);
  END IF;

  IF rec.count >= _max_count THEN
    RETURN jsonb_build_object('allowed', false, 'retry_after_seconds',
      _window_seconds - EXTRACT(EPOCH FROM (now_ts - rec.window_start))::int);
  END IF;

  UPDATE public.rate_limits SET count = rec.count + 1 WHERE id = rec.id;
  RETURN jsonb_build_object('allowed', true, 'remaining', _max_count - rec.count - 1);
END;
$$;

-- Audit event logger
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _action text,
  _target_type text DEFAULT NULL,
  _target_id text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), _action, _target_type, _target_id, _metadata);
END;
$$;

-- User panic wipe: destroys chats, cancels pending orders, zeros balance
CREATE OR REPLACE FUNCTION public.panic_wipe_user()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  room_count int := 0;
  order_count int := 0;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not authenticated');
  END IF;

  -- Delete messages in user's chat rooms
  DELETE FROM public.chat_room_messages
    WHERE room_id IN (
      SELECT id FROM public.order_chat_rooms
      WHERE buyer_id = uid OR vendor_id = uid
    );

  -- Mark rooms as destroyed
  UPDATE public.order_chat_rooms
    SET status = 'destroyed', destroyed_at = now()
    WHERE (buyer_id = uid OR vendor_id = uid) AND status = 'active';
  GET DIAGNOSTICS room_count = ROW_COUNT;

  -- Cancel pending orders where user is buyer
  UPDATE public.orders
    SET status = 'cancelled', payment_status = 'cancelled'
    WHERE buyer_id = uid AND status IN ('pending', 'awaiting_payment');
  GET DIAGNOSTICS order_count = ROW_COUNT;

  -- Delete encrypted messages
  DELETE FROM public.encrypted_messages WHERE sender_id = uid;

  -- Delete anti-phishing code
  DELETE FROM public.anti_phishing_codes WHERE user_id = uid;

  -- Zero the balance (keep withdrawn history)
  UPDATE public.user_balances
    SET available = 0, pending = 0
    WHERE user_id = uid;

  -- Audit log
  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (uid, 'panic_wipe', 'user', uid::text,
    jsonb_build_object('rooms_destroyed', room_count, 'orders_cancelled', order_count));

  RETURN jsonb_build_object('success', true, 'rooms_destroyed', room_count, 'orders_cancelled', order_count);
END;
$$;

-- Admin commission withdraw marker
CREATE OR REPLACE FUNCTION public.admin_withdraw_commission(_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_uid uuid := auth.uid();
  current_available numeric;
BEGIN
  IF NOT public.has_role(admin_uid, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  IF _amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
  END IF;

  SELECT available INTO current_available FROM public.user_balances WHERE user_id = admin_uid;
  IF COALESCE(current_available, 0) < _amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  UPDATE public.user_balances
    SET available = available - _amount,
        withdrawn = withdrawn + _amount,
        updated_at = now()
    WHERE user_id = admin_uid;

  INSERT INTO public.audit_logs (actor_id, action, target_type, metadata)
  VALUES (admin_uid, 'admin_withdraw', 'commission',
    jsonb_build_object('amount', _amount, 'cold_wallet', 'LiTaNf78XeFcLiZ1HJ9HWtsUFBajnb99YT'));

  RETURN jsonb_build_object('success', true, 'amount', _amount,
    'cold_wallet', 'LiTaNf78XeFcLiZ1HJ9HWtsUFBajnb99YT');
END;
$$;
