-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- order_chat_rooms
CREATE TABLE IF NOT EXISTS public.order_chat_rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.order_chat_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order participants view rooms" ON public.order_chat_rooms FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_chat_rooms.order_id AND (o.buyer_id = auth.uid() OR o.vendor_id = auth.uid())));
CREATE POLICY "Order participants create rooms" ON public.order_chat_rooms FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_chat_rooms.order_id AND (o.buyer_id = auth.uid() OR o.vendor_id = auth.uid())));

-- chat_room_messages
CREATE TABLE IF NOT EXISTS public.chat_room_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_room_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view chat messages" ON public.chat_room_messages FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.order_chat_rooms r JOIN public.orders o ON o.id = r.order_id
  WHERE r.id = chat_room_messages.room_id AND (o.buyer_id = auth.uid() OR o.vendor_id = auth.uid())
));
CREATE POLICY "Participants send chat messages" ON public.chat_room_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id AND EXISTS (
  SELECT 1 FROM public.order_chat_rooms r JOIN public.orders o ON o.id = r.order_id
  WHERE r.id = chat_room_messages.room_id AND (o.buyer_id = auth.uid() OR o.vendor_id = auth.uid())
));

-- user_balances
CREATE TABLE IF NOT EXISTS public.user_balances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  available numeric NOT NULL DEFAULT 0,
  pending numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own balance" ON public.user_balances FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all balances" ON public.user_balances FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'deposit',
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'LTC',
  status text NOT NULL DEFAULT 'pending',
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own transactions" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all transactions" ON public.transactions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- anti_phishing_codes
CREATE TABLE IF NOT EXISTS public.anti_phishing_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.anti_phishing_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own anti-phishing code" ON public.anti_phishing_codes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own anti-phishing code" ON public.anti_phishing_codes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own anti-phishing code" ON public.anti_phishing_codes FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- new columns
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS name text;
UPDATE public.products SET name = title WHERE name IS NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';
ALTER TABLE public.admin_auto_withdraw ADD COLUMN IF NOT EXISTS available numeric DEFAULT 0;

-- confirm_delivery RPC
CREATE OR REPLACE FUNCTION public.confirm_delivery(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id = _order_id AND buyer_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE public.orders SET status = 'completed', updated_at = now() WHERE id = _order_id;
END;
$$;