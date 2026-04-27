-- Create system_announcements table
CREATE TABLE public.system_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    priority TEXT DEFAULT 'info',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active announcements" ON public.system_announcements FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins can manage announcements" ON public.system_announcements FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed data
INSERT INTO public.system_announcements (content, priority) VALUES
('🚀 Yeni Satıcı Bond gereksinimleri güncellendi. Detaylar forumda.', 'high'),
('⚠️ Sistem bakımı 27 Nisan 03:00 UTC''de gerçekleştirilecektir.', 'medium'),
('🔐 PGP 2FA kullanımı tüm satıcılar için zorunlu hale getirilmiştir.', 'high'),
('💎 VIP Erişim kategorisine 5 yeni rota eklendi!', 'info'),
('🛡️ aeigsthub v3.0 güvenliğiniz için optimize edildi.', 'info');
