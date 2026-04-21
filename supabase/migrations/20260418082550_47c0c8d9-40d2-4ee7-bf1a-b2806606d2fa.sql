ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS withdraw_pin_hash text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS origin text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS destination text;