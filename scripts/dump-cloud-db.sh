#!/usr/bin/env bash
# Lovable Cloud (Supabase) → SQL dump
# Kullanım:  CLOUD_DB_URL='postgres://...' bash dump-cloud-db.sh
set -euo pipefail

: "${CLOUD_DB_URL:?CLOUD_DB_URL set edilmemiş. Lovable Cloud → Backend → Database → Connection string buradan al.}"

OUT="cloud-dump-$(date +%Y%m%d-%H%M%S).sql"
echo "[+] pg_dump alınıyor → ${OUT}"

# --schema=public → sadece kullanıcı tabloları
# --no-owner --no-acl → self-host'a temiz import
pg_dump "${CLOUD_DB_URL}" \
  --schema=public \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  > "${OUT}"

# GPG ile şifrele (önerilir)
if command -v gpg >/dev/null 2>&1; then
  gpg -c --cipher-algo AES256 "${OUT}"
  shred -uvz "${OUT}"
  echo "[+] Şifrelendi: ${OUT}.gpg  (orijinal güvenli silindi)"
else
  echo "[!] gpg yok — dump şifrelenmedi. Mutlaka şifrele!"
fi
