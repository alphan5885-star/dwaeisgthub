
-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- USER BALANCES
CREATE TABLE IF NOT EXISTS public.user_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  available numeric NOT NULL DEFAULT 0,
  pending numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  withdrawn numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own balance" ON public.user_balances
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage balances" ON public.user_balances
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ORDER CHAT ROOMS
CREATE TABLE IF NOT EXISTS public.order_chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE,
  buyer_id uuid NOT NULL,
  vendor_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  destroyed_at timestamptz
);

ALTER TABLE public.order_chat_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view rooms" ON public.order_chat_rooms
  FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = vendor_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Participants update rooms" ON public.order_chat_rooms
  FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = vendor_id OR public.has_role(auth.uid(), 'admin'));

-- CHAT ROOM MESSAGES
CREATE TABLE IF NOT EXISTS public.chat_room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.order_chat_rooms(id) ON DELETE CASCADE,
  sender_id uuid,
  content text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_room_messages_room ON public.chat_room_messages(room_id);

ALTER TABLE public.chat_room_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room participants view messages" ON public.chat_room_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.order_chat_rooms r
    WHERE r.id = chat_room_messages.room_id
      AND (r.buyer_id = auth.uid() OR r.vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Room participants send messages" ON public.chat_room_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND EXISTS (
      SELECT 1 FROM public.order_chat_rooms r
      WHERE r.id = chat_room_messages.room_id
        AND (r.buyer_id = auth.uid() OR r.vendor_id = auth.uid())
    )
  );

-- PRODUCTS: admin product flag
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_admin_product boolean DEFAULT false;

-- ORDERS: payment tracking
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_address text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS confirmations integer DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'awaiting_payment';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS commission_amount numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS vendor_amount numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS chat_destroyed_at timestamptz;

-- Constant: admin commission wallet (Exodus address)
CREATE OR REPLACE FUNCTION public.admin_commission_wallet()
RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT 'LiTaNf78XeFcLiZ1HJ9HWtsUFBajnb99YT'::text $$;

-- RPC: process confirmed payment → split balance, open chat room, send system message
CREATE OR REPLACE FUNCTION public.process_payment_confirmation(_order_id uuid, _confirmations integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders%ROWTYPE;
  is_admin_prod boolean;
  vendor_role text;
  commission numeric;
  vendor_share numeric;
  admin_uid uuid;
  room_id uuid;
  product_title text;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF o.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'order not found'); END IF;

  -- Always update confirmations
  UPDATE public.orders SET confirmations = _confirmations WHERE id = _order_id;

  -- Already processed? just return
  IF o.payment_status = 'confirmed' THEN
    RETURN jsonb_build_object('success', true, 'already_processed', true);
  END IF;

  -- Need 3 confirmations
  IF _confirmations < 3 THEN
    UPDATE public.orders SET payment_status = 'confirming' WHERE id = _order_id;
    RETURN jsonb_build_object('success', true, 'pending', true, 'confirmations', _confirmations);
  END IF;

  -- Determine if vendor is admin OR product flagged as admin product
  SELECT COALESCE(p.is_admin_product, false), p.title
    INTO is_admin_prod, product_title
    FROM public.products p WHERE p.id = o.product_id;

  vendor_role := public.get_user_role(o.vendor_id);

  IF vendor_role = 'admin' OR COALESCE(is_admin_prod, false) THEN
    commission := o.amount;
    vendor_share := 0;
  ELSE
    commission := ROUND((o.amount * 0.10)::numeric, 8);
    vendor_share := o.amount - commission;
  END IF;

  UPDATE public.orders SET
    status = 'paid',
    payment_status = 'confirmed',
    commission_amount = commission,
    vendor_amount = vendor_share,
    updated_at = now()
  WHERE id = _order_id;

  -- Credit vendor balance (if any share)
  IF vendor_share > 0 THEN
    INSERT INTO public.user_balances (user_id, available, total)
    VALUES (o.vendor_id, vendor_share, vendor_share)
    ON CONFLICT (user_id) DO UPDATE
      SET available = public.user_balances.available + EXCLUDED.available,
          total = public.user_balances.total + EXCLUDED.total,
          updated_at = now();
  END IF;

  -- Credit admin commission balance (first admin found)
  SELECT user_id INTO admin_uid FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  IF admin_uid IS NOT NULL AND commission > 0 THEN
    INSERT INTO public.user_balances (user_id, available, total)
    VALUES (admin_uid, commission, commission)
    ON CONFLICT (user_id) DO UPDATE
      SET available = public.user_balances.available + EXCLUDED.available,
          total = public.user_balances.total + EXCLUDED.total,
          updated_at = now();
  END IF;

  -- Open chat room (idempotent)
  INSERT INTO public.order_chat_rooms (order_id, buyer_id, vendor_id)
  VALUES (_order_id, o.buyer_id, o.vendor_id)
  ON CONFLICT (order_id) DO NOTHING
  RETURNING id INTO room_id;

  IF room_id IS NULL THEN
    SELECT id INTO room_id FROM public.order_chat_rooms WHERE order_id = _order_id;
  END IF;

  -- System message
  INSERT INTO public.chat_room_messages (room_id, sender_id, content, is_system)
  VALUES (
    room_id,
    NULL,
    'Ödeme başarıyla doğrulandı. Operatör Uraz veya ilgili satıcı ürünü teslim etmek üzere odaya katıldı. Güvenliğiniz için işlem bitince odayı imha edin.',
    true
  );

  -- Notify both
  INSERT INTO public.notifications (user_id, title, body, type, link)
  VALUES
    (o.buyer_id, 'Ödeme Onaylandı', 'Operasyon DM açıldı. ' || COALESCE(product_title, 'Sipariş') || ' için satıcıyla iletişime geç.', 'order', '/orders'),
    (o.vendor_id, 'Yeni Sipariş', COALESCE(product_title, 'Ürün') || ' ödemesi onaylandı. Operasyon DM aktif.', 'order', '/orders');

  RETURN jsonb_build_object('success', true, 'room_id', room_id, 'commission', commission, 'vendor_share', vendor_share);
END;
$$;

-- Cleanup function: destroy chats older than 24h after order completed
CREATE OR REPLACE FUNCTION public.purge_old_chat_rooms()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.chat_room_messages
  WHERE room_id IN (
    SELECT r.id FROM public.order_chat_rooms r
    JOIN public.orders o ON o.id = r.order_id
    WHERE o.status IN ('completed', 'delivered')
      AND o.updated_at < now() - interval '24 hours'
  );

  UPDATE public.order_chat_rooms
  SET status = 'destroyed', destroyed_at = now()
  WHERE status = 'active'
    AND order_id IN (
      SELECT id FROM public.orders
      WHERE status IN ('completed', 'delivered')
        AND updated_at < now() - interval '24 hours'
    );
END;
$$;

-- Schedule hourly purge
SELECT cron.schedule(
  'purge-old-chat-rooms-hourly',
  '0 * * * *',
  $$ SELECT public.purge_old_chat_rooms(); $$
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
