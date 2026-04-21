
-- Products missing columns
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_emoji TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS delivery_data TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tracking_number TEXT;

-- dispute_messages: add from_user_id and text as aliases
ALTER TABLE public.dispute_messages ADD COLUMN IF NOT EXISTS from_user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.dispute_messages ADD COLUMN IF NOT EXISTS text TEXT;

-- admin_auto_withdraw
ALTER TABLE public.admin_auto_withdraw ADD COLUMN IF NOT EXISTS min_amount NUMERIC DEFAULT 0;
ALTER TABLE public.admin_auto_withdraw ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'weekly';

-- vendor_wallets extra columns
ALTER TABLE public.vendor_wallets ADD COLUMN IF NOT EXISTS pending NUMERIC DEFAULT 0;
ALTER TABLE public.vendor_wallets ADD COLUMN IF NOT EXISTS available NUMERIC DEFAULT 0;
ALTER TABLE public.vendor_wallets ADD COLUMN IF NOT EXISTS commission NUMERIC DEFAULT 0;
ALTER TABLE public.vendor_wallets ADD COLUMN IF NOT EXISTS total NUMERIC DEFAULT 0;

-- orders: product_name for display
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS product_name TEXT;

-- Fix release_escrow to accept _escrow_id
DROP FUNCTION IF EXISTS public.release_escrow(UUID);
CREATE OR REPLACE FUNCTION public.release_escrow(_escrow_id UUID DEFAULT NULL, _order_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  oid UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  IF _escrow_id IS NOT NULL THEN
    SELECT order_id INTO oid FROM public.escrow_pool WHERE id = _escrow_id;
  ELSE
    oid := _order_id;
  END IF;
  UPDATE public.escrow_pool SET status = 'released' WHERE (id = _escrow_id OR order_id = oid);
  UPDATE public.orders SET status = 'completed' WHERE id = oid;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Fix panic_destroy to return jsonb
DROP FUNCTION IF EXISTS public.panic_destroy();
CREATE OR REPLACE FUNCTION public.panic_destroy()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  UPDATE public.orders SET status = 'cancelled' WHERE status = 'pending';
  UPDATE public.escrow_pool SET status = 'refunded' WHERE status = 'held';
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Fix process_order_payment to accept _ltc_address
DROP FUNCTION IF EXISTS public.process_order_payment(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.process_order_payment(_order_id UUID, _tx_hash TEXT DEFAULT NULL, _ltc_address TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.orders SET status = 'paid' WHERE id = _order_id;
END;
$$;
