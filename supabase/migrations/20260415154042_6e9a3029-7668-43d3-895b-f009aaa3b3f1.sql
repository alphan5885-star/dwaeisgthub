
-- Add txid and service_fee columns to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS txid text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS service_fee numeric DEFAULT 0;

-- Allow buyers to update their own orders (for TXID submission)
CREATE POLICY "Buyers can update own orders txid"
ON public.orders
FOR UPDATE
USING (auth.uid() = buyer_id)
WITH CHECK (auth.uid() = buyer_id);

-- Update generate_payment_address to return fixed central pool address
CREATE OR REPLACE FUNCTION public.generate_payment_address(_order_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Fixed central pool LTC address
  RETURN 'bc1qpyugsrx9xjvjpcdjkqjwhdm645l0039skthesp';
END;
$$;

-- Update process_order_payment to save txid and notify vendor
CREATE OR REPLACE FUNCTION public.process_order_payment(_order_id uuid, _tx_hash text DEFAULT NULL, _ltc_address text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _vendor_id uuid;
  _product_name text;
  _amount numeric;
BEGIN
  -- Get order details
  SELECT o.vendor_id, COALESCE(p.name, p.title), o.amount
  INTO _vendor_id, _product_name, _amount
  FROM public.orders o
  LEFT JOIN public.products p ON p.id = o.product_id
  WHERE o.id = _order_id;

  -- Update order with txid and status
  UPDATE public.orders SET status = 'paid', txid = _tx_hash WHERE id = _order_id;

  -- Create escrow entry
  INSERT INTO public.escrow_pool (order_id, amount, commission, status)
  VALUES (_order_id, _amount, _amount * 0.05, 'held');

  -- Notify vendor
  INSERT INTO public.notifications (user_id, title, body, type, link)
  VALUES (
    _vendor_id,
    'Ödeme Havuza Alındı',
    'Sipariş #' || LEFT(_order_id::text, 8) || ' için ' || _amount || ' LTC ödeme alındı. Ürün: ' || COALESCE(_product_name, 'Bilinmiyor') || '. Teslimatı yapın.',
    'order',
    '/orders'
  );
END;
$$;
