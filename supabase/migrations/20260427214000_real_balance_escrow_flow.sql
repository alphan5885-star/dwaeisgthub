-- Real balance + escrow flow
-- - User deposit addresses (LTC)
-- - Confirmed deposit crediting to user_balances
-- - Purchase from balance into escrow
-- - Delivery confirmation releases escrow: 90% vendor, 10% admin

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_confirmed boolean NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS public.user_deposit_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  network text NOT NULL DEFAULT 'LTC',
  address text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, network)
);

CREATE TABLE IF NOT EXISTS public.deposit_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  address text NOT NULL,
  network text NOT NULL DEFAULT 'LTC',
  tx_hash text NOT NULL,
  amount_satoshi bigint NOT NULL,
  confirmations integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  credited_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(address, tx_hash)
);

ALTER TABLE public.user_deposit_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own deposit addresses" ON public.user_deposit_addresses;
CREATE POLICY "Users view own deposit addresses"
ON public.user_deposit_addresses FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users view own deposit credits" ON public.deposit_credits;
CREATE POLICY "Users view own deposit credits"
ON public.deposit_credits FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.ensure_user_balance(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_balances (user_id, available, pending, total, updated_at)
  VALUES (_user_id, 0, 0, 0, now())
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.credit_confirmed_deposit(
  _user_id uuid,
  _address text,
  _tx_hash text,
  _amount_satoshi bigint,
  _confirmations integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted boolean := false;
  amount_ltc numeric;
BEGIN
  IF _amount_satoshi <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid amount');
  END IF;

  PERFORM public.ensure_user_balance(_user_id);

  INSERT INTO public.deposit_credits (user_id, address, tx_hash, amount_satoshi, confirmations)
  VALUES (_user_id, _address, _tx_hash, _amount_satoshi, GREATEST(_confirmations, 0))
  ON CONFLICT (address, tx_hash) DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;
  IF inserted = false THEN
    RETURN jsonb_build_object('success', true, 'already_credited', true);
  END IF;

  amount_ltc := (_amount_satoshi::numeric / 100000000::numeric);

  UPDATE public.user_balances
  SET available = available + amount_ltc,
      total = total + amount_ltc,
      updated_at = now()
  WHERE user_id = _user_id;

  INSERT INTO public.transactions (user_id, type, amount, currency, status, reference, description)
  VALUES (_user_id, 'deposit', amount_ltc, 'LTC', 'completed', _tx_hash, 'LTC deposit confirmed');

  RETURN jsonb_build_object('success', true, 'credited', true, 'amount_ltc', amount_ltc);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_order_with_escrow(
  _product_id uuid,
  _delivery_method text DEFAULT 'cargo',
  _shipping_address text DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  buyer uuid;
  prod record;
  order_id uuid;
  amount numeric;
  commission numeric;
BEGIN
  buyer := auth.uid();
  IF buyer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  SELECT id, vendor_id, price, type, stock
    INTO prod
    FROM public.products
    WHERE id = _product_id AND is_active = true;

  IF prod.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'product_not_found');
  END IF;

  IF prod.vendor_id = buyer THEN
    RETURN jsonb_build_object('success', false, 'error', 'cannot_buy_own_product');
  END IF;

  IF COALESCE(prod.stock, 0) <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'out_of_stock');
  END IF;

  amount := COALESCE(prod.price, 0);
  commission := ROUND((amount * 0.10)::numeric, 8);

  PERFORM public.ensure_user_balance(buyer);

  UPDATE public.user_balances
  SET available = available - amount,
      total = total - amount,
      updated_at = now()
  WHERE user_id = buyer
    AND available >= amount;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance');
  END IF;

  INSERT INTO public.orders (
    product_id,
    buyer_id,
    vendor_id,
    amount,
    status,
    payment_status,
    service_fee,
    delivery_method,
    shipping_address,
    notes,
    delivery_confirmed,
    updated_at
  )
  VALUES (
    prod.id,
    buyer,
    prod.vendor_id,
    amount,
    'processing',
    'escrow_held',
    0,
    CASE WHEN prod.type = 'digital' THEN 'cargo' ELSE COALESCE(_delivery_method, 'cargo') END,
    _shipping_address,
    _notes,
    false,
    now()
  )
  RETURNING id INTO order_id;

  INSERT INTO public.escrow_pool (order_id, amount, commission, status, created_at)
  VALUES (order_id, amount, commission, 'held', now());

  INSERT INTO public.vendor_wallets (vendor_id, pending, available, commission, total, updated_at)
  VALUES (prod.vendor_id, amount, 0, 0, 0, now())
  ON CONFLICT (vendor_id) DO UPDATE
    SET pending = public.vendor_wallets.pending + EXCLUDED.pending,
        updated_at = now();

  INSERT INTO public.transactions (user_id, type, amount, currency, status, reference, description)
  VALUES (buyer, 'purchase', amount, 'LTC', 'completed', order_id::text, 'Balance -> escrow hold');

  RETURN jsonb_build_object('success', true, 'order_id', order_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_delivery(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders%ROWTYPE;
  e record;
  admin_uid uuid;
  vendor_share numeric;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF o.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;

  IF o.buyer_id <> auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  IF o.status = 'completed' THEN
    RETURN jsonb_build_object('success', true, 'already_completed', true);
  END IF;

  SELECT id, amount, commission, status INTO e
  FROM public.escrow_pool
  WHERE order_id = _order_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF e.id IS NULL OR e.status <> 'held' THEN
    RETURN jsonb_build_object('success', false, 'error', 'escrow_not_held');
  END IF;

  vendor_share := GREATEST(COALESCE(e.amount, 0) - COALESCE(e.commission, 0), 0);

  UPDATE public.escrow_pool
  SET status = 'released'
  WHERE id = e.id;

  UPDATE public.vendor_wallets
  SET pending = GREATEST(pending - COALESCE(e.amount, 0), 0),
      available = available + vendor_share,
      total = total + vendor_share,
      commission = commission + COALESCE(e.commission, 0),
      updated_at = now()
  WHERE vendor_id = o.vendor_id;

  SELECT user_id INTO admin_uid
  FROM public.user_roles
  WHERE role = 'admin'
  ORDER BY created_at ASC
  LIMIT 1;

  IF admin_uid IS NOT NULL AND COALESCE(e.commission, 0) > 0 THEN
    PERFORM public.ensure_user_balance(admin_uid);
    UPDATE public.user_balances
    SET available = available + COALESCE(e.commission, 0),
        total = total + COALESCE(e.commission, 0),
        updated_at = now()
    WHERE user_id = admin_uid;

    INSERT INTO public.transactions (user_id, type, amount, currency, status, reference, description)
    VALUES (admin_uid, 'commission', COALESCE(e.commission, 0), 'LTC', 'completed', _order_id::text, 'Escrow commission');
  END IF;

  INSERT INTO public.transactions (user_id, type, amount, currency, status, reference, description)
  VALUES (o.vendor_id, 'escrow_release', vendor_share, 'LTC', 'completed', _order_id::text, 'Escrow released to vendor');

  UPDATE public.orders
  SET delivery_confirmed = true,
      status = 'completed',
      payment_status = 'released',
      updated_at = now()
  WHERE id = _order_id;

  RETURN jsonb_build_object('success', true, 'vendor_share', vendor_share, 'commission', COALESCE(e.commission, 0));
END;
$$;
