
-- Products
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    category TEXT,
    image_url TEXT,
    stock INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Vendors can manage own products" ON public.products FOR ALL TO authenticated USING (auth.uid() = vendor_id) WITH CHECK (auth.uid() = vendor_id);

-- Orders
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID REFERENCES auth.users(id) NOT NULL,
    vendor_id UUID REFERENCES auth.users(id) NOT NULL,
    product_id UUID REFERENCES public.products(id),
    amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    delivery_method TEXT DEFAULT 'shipping',
    shipping_address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers can view own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = buyer_id);
CREATE POLICY "Vendors can view orders for them" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = vendor_id);
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Buyers can create orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Vendors can update own orders" ON public.orders FOR UPDATE TO authenticated USING (auth.uid() = vendor_id);

-- Disputes
CREATE TABLE public.disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID REFERENCES auth.users(id) NOT NULL,
    seller_id UUID REFERENCES auth.users(id) NOT NULL,
    order_id UUID REFERENCES public.orders(id),
    product_name TEXT,
    amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'open',
    reason TEXT,
    resolution TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Involved parties can view disputes" ON public.disputes FOR SELECT TO authenticated USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Buyers can create disputes" ON public.disputes FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Admins can update disputes" ON public.disputes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Dispute messages
CREATE TABLE public.dispute_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID REFERENCES public.disputes(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dispute participants can view messages" ON public.dispute_messages FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.disputes d WHERE d.id = dispute_id AND (d.buyer_id = auth.uid() OR d.seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);
CREATE POLICY "Dispute participants can send messages" ON public.dispute_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

-- Escrow pool
CREATE TABLE public.escrow_pool (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id),
    amount NUMERIC DEFAULT 0,
    commission NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'held',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.escrow_pool ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view escrow" ON public.escrow_pool FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage escrow" ON public.escrow_pool FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Encrypted messages
CREATE TABLE public.encrypted_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    sender_id UUID REFERENCES auth.users(id) NOT NULL,
    ciphertext TEXT NOT NULL,
    iv TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.encrypted_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order participants can view messages" ON public.encrypted_messages FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.vendor_id = auth.uid()))
);
CREATE POLICY "Order participants can send messages" ON public.encrypted_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

-- Shipping tracking
CREATE TABLE public.shipping_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    tracking_number TEXT,
    carrier TEXT,
    status TEXT DEFAULT 'pending',
    estimated_delivery TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shipping_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order participants can view tracking" ON public.shipping_tracking FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.vendor_id = auth.uid()))
);

-- Dead drop locations
CREATE TABLE public.dead_drop_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    latitude NUMERIC,
    longitude NUMERIC,
    description TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dead_drop_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order participants can view dead drops" ON public.dead_drop_locations FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.vendor_id = auth.uid()))
);

-- Vendor ratings
CREATE TABLE public.vendor_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES auth.users(id) NOT NULL,
    buyer_id UUID REFERENCES auth.users(id) NOT NULL,
    order_id UUID REFERENCES public.orders(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vendor_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view ratings" ON public.vendor_ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Buyers can create ratings" ON public.vendor_ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);

-- Vendor bonds
CREATE TABLE public.vendor_bonds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vendor_bonds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors can view own bonds" ON public.vendor_bonds FOR SELECT TO authenticated USING (auth.uid() = vendor_id);
CREATE POLICY "Admins can view all bonds" ON public.vendor_bonds FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin auto withdraw
CREATE TABLE public.admin_auto_withdraw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) NOT NULL,
    cold_wallet TEXT,
    threshold NUMERIC DEFAULT 0,
    enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_auto_withdraw ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage auto withdraw" ON public.admin_auto_withdraw FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Forum posts
CREATE TABLE public.forum_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view posts" ON public.forum_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create posts" ON public.forum_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can edit own posts" ON public.forum_posts FOR UPDATE TO authenticated USING (auth.uid() = author_id);

-- Forum comments
CREATE TABLE public.forum_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES auth.users(id) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view comments" ON public.forum_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create comments" ON public.forum_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

-- Notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT DEFAULT 'system',
    title TEXT NOT NULL,
    body TEXT,
    read BOOLEAN DEFAULT false,
    link TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- RPC: release_escrow
CREATE OR REPLACE FUNCTION public.release_escrow(_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE public.escrow_pool SET status = 'released' WHERE order_id = _order_id;
  UPDATE public.orders SET status = 'completed' WHERE id = _order_id;
END;
$$;

-- RPC: panic_destroy
CREATE OR REPLACE FUNCTION public.panic_destroy()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  -- Emergency: mark all pending orders as cancelled
  UPDATE public.orders SET status = 'cancelled' WHERE status = 'pending';
  UPDATE public.escrow_pool SET status = 'refunded' WHERE status = 'held';
END;
$$;

-- RPC: get_vendor_rating
CREATE OR REPLACE FUNCTION public.get_vendor_rating(_vendor_id UUID)
RETURNS TABLE(avg_rating NUMERIC, total_ratings BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(AVG(rating)::NUMERIC, 0), COUNT(*)
  FROM public.vendor_ratings
  WHERE vendor_id = _vendor_id;
$$;
