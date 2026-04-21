ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'digital',
  ADD COLUMN IF NOT EXISTS image_emoji text,
  ADD COLUMN IF NOT EXISTS delivery_data text,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS origin text,
  ADD COLUMN IF NOT EXISTS destination text;

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS service_fee numeric DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.vendor_wallets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id uuid NOT NULL UNIQUE,
  pending numeric NOT NULL DEFAULT 0,
  available numeric NOT NULL DEFAULT 0,
  commission numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vendor_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors view own wallet" ON public.vendor_wallets FOR SELECT TO authenticated USING (auth.uid() = vendor_id);
CREATE POLICY "Admins view all wallets" ON public.vendor_wallets FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));