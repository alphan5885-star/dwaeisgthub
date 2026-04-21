-- =====================================================
-- AUTOMATION TRIGGERS & FUNCTIONS
-- Sitenin tüm otomasyon gereksinimleri
-- =====================================================

-- 1. YENİ KULLANICI KAYDI SONRASI OTOMATİK PROFİL OLUŞTURMA
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Yeni kullanıcı için profil oluştur
  INSERT INTO public.profiles (user_id, display_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger: Yeni kullanıcı kaydında profil oluştur
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- 2. YENİ SATICI İÇİN OTOMATİK CÜZDAN OLUŞTURMA
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_vendor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sadece vendor rolü için cüzdan oluştur
  IF NEW.role = 'vendor' THEN
    INSERT INTO public.vendor_wallets (vendor_id, balance, available, pending, total, commission, created_at, updated_at)
    VALUES (NEW.user_id, 0, 0, 0, 0, 0, NOW(), NOW())
    ON CONFLICT DO NOTHING;
    
    -- Satıcı bond kaydı oluştur (varsayılan pending)
    INSERT INTO public.vendor_bonds (vendor_id, amount, status, created_at)
    VALUES (NEW.user_id, 0, 'pending', NOW())
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger: Yeni satıcı rolü atandığında cüzdan oluştur
DROP TRIGGER IF EXISTS on_vendor_role_created ON public.user_roles;
CREATE TRIGGER on_vendor_role_created
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_vendor();


-- 3. SİPARİŞ VERİLDİĞİNDE OTOMATİK STOK DÜŞÜRME
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_order_stock_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Stok düşür
  IF NEW.product_id IS NOT NULL THEN
    UPDATE public.products
    SET stock = GREATEST(stock - 1, 0),
        updated_at = NOW()
    WHERE id = NEW.product_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger: Yeni sipariş oluşturulduğunda stok düşür
DROP TRIGGER IF EXISTS on_order_created_stock ON public.orders;
CREATE TRIGGER on_order_created_stock
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_stock_update();


-- 4. SİPARİŞ DURUMU DEĞİŞİKLİKLERİNDE OTOMATİK BİLDİRİM
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_order_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_title TEXT;
  notification_body TEXT;
BEGIN
  -- Yeni sipariş bildirimi (satıcıya)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, title, body, type, link, created_at)
    VALUES (
      NEW.vendor_id,
      'Yeni Sipariş!',
      'Yeni bir sipariş aldınız: ' || COALESCE(NEW.product_name, 'Ürün') || ' - ' || NEW.amount || ' LTC',
      'order',
      '/vendor',
      NOW()
    );
    
    -- Alıcıya da bildirim
    INSERT INTO public.notifications (user_id, title, body, type, link, created_at)
    VALUES (
      NEW.buyer_id,
      'Sipariş Oluşturuldu',
      'Siparişiniz başarıyla oluşturuldu: ' || COALESCE(NEW.product_name, 'Ürün'),
      'order',
      '/orders',
      NOW()
    );
  END IF;
  
  -- Durum değişikliği bildirimi
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Status'a göre başlık belirle
    CASE NEW.status
      WHEN 'processing' THEN
        notification_title := 'Sipariş İşleniyor';
        notification_body := 'Siparişiniz hazırlanıyor: ' || COALESCE(NEW.product_name, 'Ürün');
      WHEN 'shipped' THEN
        notification_title := 'Sipariş Kargoya Verildi';
        notification_body := 'Siparişiniz kargoya verildi: ' || COALESCE(NEW.product_name, 'Ürün');
      WHEN 'completed' THEN
        notification_title := 'Sipariş Tamamlandı';
        notification_body := 'Siparişiniz tamamlandı: ' || COALESCE(NEW.product_name, 'Ürün');
      WHEN 'cancelled' THEN
        notification_title := 'Sipariş İptal Edildi';
        notification_body := 'Siparişiniz iptal edildi: ' || COALESCE(NEW.product_name, 'Ürün');
      WHEN 'refunded' THEN
        notification_title := 'İade Yapıldı';
        notification_body := 'Siparişiniz için iade işlemi tamamlandı: ' || COALESCE(NEW.product_name, 'Ürün');
      ELSE
        notification_title := 'Sipariş Güncellendi';
        notification_body := 'Sipariş durumu güncellendi: ' || COALESCE(NEW.product_name, 'Ürün');
    END CASE;
    
    -- Alıcıya bildirim
    INSERT INTO public.notifications (user_id, title, body, type, link, created_at)
    VALUES (NEW.buyer_id, notification_title, notification_body, 'order', '/orders', NOW());
  END IF;
  
  -- Teslimat onayı bildirimi (satıcıya)
  IF TG_OP = 'UPDATE' AND OLD.delivery_confirmed IS DISTINCT FROM NEW.delivery_confirmed AND NEW.delivery_confirmed = true THEN
    INSERT INTO public.notifications (user_id, title, body, type, link, created_at)
    VALUES (
      NEW.vendor_id,
      'Teslimat Onaylandı!',
      'Alıcı teslimatı onayladı: ' || COALESCE(NEW.product_name, 'Ürün') || ' - Ödemeniz serbest bırakılacak.',
      'payment',
      '/vendor/wallet',
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger: Sipariş oluşturma ve güncelleme
DROP TRIGGER IF EXISTS on_order_notification ON public.orders;
CREATE TRIGGER on_order_notification
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_notification();


-- 5. TESLİMAT ONAYI SONRASI OTOMATİK ESCROW SERBEST BIRAKMA
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_delivery_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  escrow_record RECORD;
  vendor_commission NUMERIC;
  vendor_amount NUMERIC;
BEGIN
  -- Sadece teslimat onaylandığında çalış
  IF OLD.delivery_confirmed IS DISTINCT FROM NEW.delivery_confirmed AND NEW.delivery_confirmed = true THEN
    -- Escrow kaydını bul
    SELECT * INTO escrow_record
    FROM public.escrow_pool
    WHERE order_id = NEW.id AND status = 'held'
    LIMIT 1;
    
    IF escrow_record IS NOT NULL THEN
      -- Escrow'u serbest bırak
      UPDATE public.escrow_pool
      SET status = 'released'
      WHERE id = escrow_record.id;
      
      -- Satıcı cüzdanını güncelle (komisyon düşülmüş miktar)
      vendor_amount := COALESCE(escrow_record.amount, 0) - COALESCE(escrow_record.commission, 0);
      
      UPDATE public.vendor_wallets
      SET 
        balance = balance + vendor_amount,
        available = available + vendor_amount,
        pending = GREATEST(pending - COALESCE(escrow_record.amount, 0), 0),
        total = total + vendor_amount,
        updated_at = NOW()
      WHERE vendor_id = NEW.vendor_id;
      
      -- İşlem kaydı oluştur
      INSERT INTO public.transactions (user_id, amount, type, status, description, order_id, created_at)
      VALUES (
        NEW.vendor_id,
        vendor_amount,
        'escrow_release',
        'completed',
        'Escrow serbest bırakıldı - Sipariş: ' || NEW.id,
        NEW.id,
        NOW()
      );
    END IF;
    
    -- Sipariş durumunu tamamlandı yap
    -- (Bu trigger'ın recursive çağrılmasını engellemek için kontrol)
    IF NEW.status != 'completed' THEN
      NEW.status := 'completed';
      NEW.updated_at := NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger: Teslimat onayı sonrası escrow serbest bırakma
DROP TRIGGER IF EXISTS on_delivery_confirmed ON public.orders;
CREATE TRIGGER on_delivery_confirmed
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_delivery_confirmed();


-- 6. ANLAŞMAZLIK (DISPUTE) BİLDİRİMLERİ
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_dispute_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Satıcıya bildirim
    INSERT INTO public.notifications (user_id, title, body, type, link, created_at)
    VALUES (
      NEW.seller_id,
      'Yeni Anlaşmazlık!',
      'Bir alıcı anlaşmazlık açtı: ' || COALESCE(NEW.product_name, 'Sipariş'),
      'dispute',
      '/vendor',
      NOW()
    );
    
    -- Adminlere bildirim (tüm adminleri bul)
    INSERT INTO public.notifications (user_id, title, body, type, link, created_at)
    SELECT 
      ur.user_id,
      'Yeni Anlaşmazlık Bildirimi',
      'Yeni bir anlaşmazlık açıldı: ' || COALESCE(NEW.product_name, 'Sipariş') || ' - Tutar: ' || COALESCE(NEW.amount, 0) || ' LTC',
      'dispute',
      '/admin/disputes',
      NOW()
    FROM public.user_roles ur
    WHERE ur.role = 'admin';
  END IF;
  
  -- Durum değişikliği
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Alıcıya bildirim
    INSERT INTO public.notifications (user_id, title, body, type, link, created_at)
    VALUES (
      NEW.buyer_id,
      'Anlaşmazlık Güncellendi',
      'Anlaşmazlık durumu: ' || NEW.status || ' - ' || COALESCE(NEW.product_name, 'Sipariş'),
      'dispute',
      '/orders',
      NOW()
    );
    
    -- Satıcıya bildirim
    INSERT INTO public.notifications (user_id, title, body, type, link, created_at)
    VALUES (
      NEW.seller_id,
      'Anlaşmazlık Güncellendi',
      'Anlaşmazlık durumu: ' || NEW.status || ' - ' || COALESCE(NEW.product_name, 'Sipariş'),
      'dispute',
      '/vendor',
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger: Anlaşmazlık bildirimleri
DROP TRIGGER IF EXISTS on_dispute_notification ON public.disputes;
CREATE TRIGGER on_dispute_notification
  AFTER INSERT OR UPDATE ON public.disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_dispute_notification();


-- 7. SATICI PUANLAMASI SONRASI ORTALAMA GÜNCELLEME FONKSİYONU
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_vendor_rating(_vendor_id UUID)
RETURNS TABLE(avg_rating NUMERIC, total_ratings BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(ROUND(AVG(rating)::numeric, 1), 0) as avg_rating,
    COUNT(*) as total_ratings
  FROM public.vendor_ratings
  WHERE vendor_id = _vendor_id;
$$;


-- 8. SİPARİŞ OLUŞTURMA SIRASINDA OTOMATİK ESCROW OLUŞTURMA
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_order_escrow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  commission_rate NUMERIC := 0.05; -- %5 komisyon
  escrow_amount NUMERIC;
  escrow_commission NUMERIC;
BEGIN
  -- Escrow miktarını hesapla
  escrow_amount := NEW.amount;
  escrow_commission := escrow_amount * commission_rate;
  
  -- Escrow kaydı oluştur
  INSERT INTO public.escrow_pool (order_id, amount, commission, status, created_at)
  VALUES (NEW.id, escrow_amount, escrow_commission, 'held', NOW());
  
  -- Satıcının pending bakiyesini güncelle
  UPDATE public.vendor_wallets
  SET pending = pending + escrow_amount,
      updated_at = NOW()
  WHERE vendor_id = NEW.vendor_id;
  
  -- İşlem kaydı oluştur (alıcı için)
  INSERT INTO public.transactions (user_id, amount, type, status, description, order_id, created_at)
  VALUES (
    NEW.buyer_id,
    escrow_amount,
    'purchase',
    'completed',
    'Ürün satın alımı: ' || COALESCE(NEW.product_name, 'Ürün'),
    NEW.id,
    NOW()
  );
  
  RETURN NEW;
END;
$$;

-- Trigger: Sipariş oluşturulduğunda escrow oluştur
DROP TRIGGER IF EXISTS on_order_created_escrow ON public.orders;
CREATE TRIGGER on_order_created_escrow
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_escrow();


-- 9. FORUM YORUMU BİLDİRİMİ
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_forum_comment_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author_id UUID;
  post_title TEXT;
BEGIN
  -- Post sahibini bul
  SELECT author_id, title INTO post_author_id, post_title
  FROM public.forum_posts
  WHERE id = NEW.post_id;
  
  -- Kendi postuna yorum yapmıyorsa bildirim gönder
  IF post_author_id IS NOT NULL AND post_author_id != NEW.author_id THEN
    INSERT INTO public.notifications (user_id, title, body, type, link, created_at)
    VALUES (
      post_author_id,
      'Yeni Yorum',
      'Postunuza yeni bir yorum yapıldı: ' || COALESCE(post_title, 'Post'),
      'forum',
      '/forum',
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger: Forum yorumu bildirimi
DROP TRIGGER IF EXISTS on_forum_comment_notification ON public.forum_comments;
CREATE TRIGGER on_forum_comment_notification
  AFTER INSERT ON public.forum_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_forum_comment_notification();


-- 10. OTOMATİK ESKİ BİLDİRİMLERİ TEMİZLEME FONKSİYONU
-- =====================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 30 günden eski okunmuş bildirimleri sil
  DELETE FROM public.notifications
  WHERE read = true AND created_at < NOW() - INTERVAL '30 days';
  
  -- 90 günden eski tüm bildirimleri sil
  DELETE FROM public.notifications
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;


-- 11. GÜVENLİK LOGU TEMİZLEME FONKSİYONU
-- =====================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_security_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 180 günden eski logları sil
  DELETE FROM public.security_logs
  WHERE created_at < NOW() - INTERVAL '180 days';
END;
$$;


-- 12. SATICI BOND DURUMU DEĞİŞİKLİĞİ BİLDİRİMİ
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_bond_status_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, title, body, type, link, created_at)
    VALUES (
      NEW.vendor_id,
      CASE NEW.status
        WHEN 'active' THEN 'Bond Aktif!'
        WHEN 'pending' THEN 'Bond Beklemede'
        WHEN 'forfeited' THEN 'Bond Kaybedildi'
        ELSE 'Bond Durumu Güncellendi'
      END,
      CASE NEW.status
        WHEN 'active' THEN 'Satıcı bond''unuz aktif edildi. Artık ürün satabilirsiniz.'
        WHEN 'pending' THEN 'Bond ödemeniz bekleniyor.'
        WHEN 'forfeited' THEN 'Bond''unuz kaybedildi. Yeni bond yatırmanız gerekiyor.'
        ELSE 'Bond durumunuz güncellendi: ' || NEW.status
      END,
      'bond',
      '/vendor/bond',
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger: Bond durumu değişikliği bildirimi
DROP TRIGGER IF EXISTS on_bond_status_notification ON public.vendor_bonds;
CREATE TRIGGER on_bond_status_notification
  AFTER UPDATE ON public.vendor_bonds
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_bond_status_notification();


-- 13. RLS POLİCYLERİ (Notifications tablosu için)
-- =====================================================
-- Bildirimler için RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);


-- 14. TRANSACTİONS TABLOSU İÇİN RLS
-- =====================================================
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));


-- 15. ESCROW POOL İÇİN RLS
-- =====================================================
ALTER TABLE public.escrow_pool ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all escrows" ON public.escrow_pool;
CREATE POLICY "Admins can view all escrows"
ON public.escrow_pool FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Vendors can view own escrows" ON public.escrow_pool;
CREATE POLICY "Vendors can view own escrows"
ON public.escrow_pool FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = escrow_pool.order_id
    AND (o.vendor_id = auth.uid() OR o.buyer_id = auth.uid())
  )
);


-- 16. VENDOR WALLETS İÇİN RLS
-- =====================================================
ALTER TABLE public.vendor_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendors can view own wallet" ON public.vendor_wallets;
CREATE POLICY "Vendors can view own wallet"
ON public.vendor_wallets FOR SELECT
TO authenticated
USING (auth.uid() = vendor_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Vendors can update own wallet" ON public.vendor_wallets;
CREATE POLICY "Vendors can update own wallet"
ON public.vendor_wallets FOR UPDATE
TO authenticated
USING (auth.uid() = vendor_id);


-- 17. PROFILES İÇİN RLS
-- =====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Anyone can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);


-- TAMAMLANDI!
-- Bu migration dosyası aşağıdaki otomasyonları sağlar:
-- 1. Yeni kullanıcı -> Otomatik profil oluşturma
-- 2. Yeni satıcı -> Otomatik cüzdan ve bond kaydı oluşturma
-- 3. Yeni sipariş -> Otomatik stok düşürme
-- 4. Sipariş durumu değişikliği -> Otomatik bildirim
-- 5. Teslimat onayı -> Otomatik escrow serbest bırakma
-- 6. Anlaşmazlık -> Otomatik bildirimler
-- 7. Sipariş oluşturma -> Otomatik escrow oluşturma
-- 8. Forum yorumu -> Post sahibine bildirim
-- 9. Bond durumu değişikliği -> Satıcıya bildirim
-- 10. Temizlik fonksiyonları (eski bildirimler, loglar)
