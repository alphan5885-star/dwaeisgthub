

## Site Durumu Özeti

Sitenin şu an genel olarak **çalışır durumda** olduğunu doğruladım — admin girişi başarılı, `get_user_role` "admin" dönüyor, watchlist/orders/notifications sorguları 200 dönüyor. Ancak bazı küçük gürültüler ve kontrol etmem gereken noktalar var.

### Doğrulananlar (✅)
- **Auth**: admin@aeigsth.com girişi çalışıyor, rol = admin
- **DB**: 27 tablo aktif (orders, products, escrow_pool, user_pgp_keys, watchlist, rate_limits, account_lockouts vb.)
- **RPC'ler**: `get_user_role`, `is_account_locked`, `record_login_attempt`, `check_rate_limit`, `has_role` çalışıyor
- **Yeni özellikler**: PGP Vault, Watchlist, Command Palette, Notifications hepsi DB ve API seviyesinde aktif

### Küçük Sorunlar (⚠️)
1. **`anti_phishing_codes` 406 hataları** — Kod `.single()` ile sorgu atıyor ama kullanıcının kaydı yok. Hatasız davranmalı (`.maybeSingle()` kullanmalı).
2. **Eski SSR `localStorage` hatası** — Log'da görünen kalıntı; mevcut kod SSR-safe ama eski cached hata olabilir, doğrulamam gerekiyor.
3. **Admin user_metadata.signup_role = "vendor"** — Display name de placeholder ("asdasdasdasd"). Profile düzeltilebilir.

### Henüz Test Etmedim
- Sipariş oluşturma akışı (PGP otomatik şifreleme)
- Edge functions: `create-payment-address`, `check-payment-status`, `kizilyurek-chat`
- Captcha puzzle gerçek tarayıcıda
- Vendor wallet / withdraw akışı

### Yapılacaklar (onaylarsan)

1. `anti_phishing_codes` sorgularını `.maybeSingle()` yapıp 406 gürültüsünü kaldır
2. Edge function'ları ping atıp çalıştığından emin ol
3. SSR `localStorage` referansını son kez doğrula (HMR cache temizliği)
4. Admin profil bilgilerini düzelt (display_name + signup_role metadata)
5. Sonuç raporu: hangi sayfa/akış çalışıyor, hangisi değil — tek bir checklist

### Teknik Detaylar
- 406 = PostgREST `.single()` 0 satıra `Cannot coerce` döndürür → `maybeSingle()` çözer
- Edge fn test: `supabase--curl_edge_functions` ile health check
- Auth metadata: `supabase.auth.admin.updateUserById` veya direkt SQL

Onaylarsan bu 5 maddeyi sırayla çalıştırırım.

