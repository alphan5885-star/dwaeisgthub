ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_confirmed boolean DEFAULT false;