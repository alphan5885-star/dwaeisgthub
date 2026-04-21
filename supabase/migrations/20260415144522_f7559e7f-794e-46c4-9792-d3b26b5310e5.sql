
-- Add name column to products (alias for title)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS name TEXT;
UPDATE public.products SET name = title WHERE name IS NULL;

-- Add commission_rate and type to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 0.05;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'physical';

-- Profiles
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    pgp_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Anti phishing codes
CREATE TABLE public.anti_phishing_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    code TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.anti_phishing_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own code" ON public.anti_phishing_codes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can upsert own code" ON public.anti_phishing_codes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own code" ON public.anti_phishing_codes FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Transactions
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    type TEXT DEFAULT 'payment',
    amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending',
    description TEXT,
    order_id UUID REFERENCES public.orders(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Vendor wallets
CREATE TABLE public.vendor_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    balance NUMERIC DEFAULT 0,
    btc_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vendor_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors can view own wallet" ON public.vendor_wallets FOR SELECT TO authenticated USING (auth.uid() = vendor_id);
CREATE POLICY "Vendors can update own wallet" ON public.vendor_wallets FOR UPDATE TO authenticated USING (auth.uid() = vendor_id);

-- RPC: confirm_delivery
CREATE OR REPLACE FUNCTION public.confirm_delivery(_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.orders SET status = 'delivered' WHERE id = _order_id AND buyer_id = auth.uid();
END;
$$;

-- RPC: generate_payment_address (stub)
CREATE OR REPLACE FUNCTION public.generate_payment_address(_order_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'bc1q' || substr(md5(random()::text), 1, 32);
END;
$$;

-- RPC: process_order_payment (stub)
CREATE OR REPLACE FUNCTION public.process_order_payment(_order_id UUID, _tx_hash TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.orders SET status = 'paid' WHERE id = _order_id;
END;
$$;
