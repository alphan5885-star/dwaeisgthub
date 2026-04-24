#!/usr/bin/env bash
# ============================================================================
# aeigsthub — Tor Hidden Service otomatik kurulum scripti
# Hedef: Debian 12 / Ubuntu 22.04 (root)
# Kullanım:  bash deploy-tor.sh
# Idempotent: tekrar çalıştırılabilir.
# ============================================================================
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/CHANGE-ME/aeigsthub.git}"
APP_DIR="/opt/aeigsth"
HS_NAME="aeigsth"
HS_DIR="/var/lib/tor/${HS_NAME}"
NODE_PORT=3000

log() { printf "\033[1;32m[+]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[!]\033[0m %s\n" "$*"; }
die() { printf "\033[1;31m[x]\033[0m %s\n" "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "Bu scripti root olarak çalıştır."

log "Sistem güncelleniyor..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq tor nginx curl git ufw fail2ban gnupg ca-certificates lsb-release

log "Saat dilimi UTC'ye sabitleniyor (timing fingerprint azaltma)..."
timedatectl set-timezone UTC || true

log "Firewall kuruluyor (yalnızca localhost)..."
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow from 127.0.0.1
# Acil SSH erişimi için yorum satırını aç:
# ufw allow 22/tcp
ufw --force enable

log "Node.js 20 kuruluyor..."
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null
  apt-get install -y -qq nodejs
fi
npm install -g pm2 >/dev/null

log "Docker kuruluyor (self-hosted Supabase için)..."
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh >/dev/null
fi

log "Self-hosted Supabase kuruluyor (${APP_DIR}/supabase)..."
mkdir -p "${APP_DIR}"
if [[ ! -d "${APP_DIR}/supabase" ]]; then
  git clone --depth 1 https://github.com/supabase/supabase "${APP_DIR}/supabase"
fi
cd "${APP_DIR}/supabase/docker"
[[ -f .env ]] || cp .env.example .env
warn "ÖNEMLİ: ${APP_DIR}/supabase/docker/.env içindeki POSTGRES_PASSWORD, JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY değerlerini RASTGELE değiştir!"
docker compose up -d

log "Uygulama kodu klonlanıyor (${APP_DIR}/app)..."
if [[ ! -d "${APP_DIR}/app" ]]; then
  git clone "${REPO_URL}" "${APP_DIR}/app" || warn "Repo klonlanamadı. ${APP_DIR}/app'a manuel kopyala."
fi
if [[ -d "${APP_DIR}/app" ]]; then
  cd "${APP_DIR}/app"
  npm install
  cat > .env <<EOF
VITE_SUPABASE_URL=http://127.0.0.1:8000
VITE_SUPABASE_PUBLISHABLE_KEY=CHANGE_ME_TO_SELFHOST_ANON_KEY
VITE_SUPABASE_PROJECT_ID=selfhosted
EOF
  warn "${APP_DIR}/app/.env içindeki ANON_KEY'i self-host değeriyle değiştir, sonra: cd ${APP_DIR}/app && npm run build"
fi

log "Tor hidden service yapılandırılıyor..."
if ! grep -q "HiddenServiceDir ${HS_DIR}" /etc/tor/torrc; then
  cat >> /etc/tor/torrc <<EOF

# aeigsthub hidden service
HiddenServiceDir ${HS_DIR}/
HiddenServicePort 80 127.0.0.1:80
EOF
fi
systemctl restart tor
sleep 3

log "nginx yapılandırılıyor (sıkı CSP + log kapalı)..."
cat > /etc/nginx/sites-available/aeigsth <<NGINX
server {
    listen 127.0.0.1:80 default_server;
    server_name _;

    server_tokens off;
    access_log off;
    error_log /dev/null crit;

    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Permissions-Policy "interest-cohort=(), geolocation=(), camera=(), microphone=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'" always;
    add_header Cache-Control "no-store, no-cache, must-revalidate" always;

    location / {
        proxy_pass http://127.0.0.1:${NODE_PORT};
        proxy_set_header Host \$host;
        proxy_hide_header Server;
        proxy_hide_header X-Powered-By;
    }
}
NGINX
ln -sf /etc/nginx/sites-available/aeigsth /etc/nginx/sites-enabled/aeigsth
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

log "fail2ban etkinleştiriliyor..."
systemctl enable --now fail2ban >/dev/null

if [[ -f "${HS_DIR}/hostname" ]]; then
  echo
  echo "=================================================================="
  echo "  🧅  HIDDEN SERVICE HAZIR"
  echo "=================================================================="
  cat "${HS_DIR}/hostname"
  echo "=================================================================="
  echo "  Tor Browser ile yukarıdaki adresi aç."
  echo "  Test:  torsocks curl -I http://\$(cat ${HS_DIR}/hostname)"
  echo "=================================================================="
else
  warn "Hidden service hostname henüz oluşmadı. 30sn bekleyip tekrar dene: cat ${HS_DIR}/hostname"
fi

cat <<'NEXT'

SONRAKI ADIMLAR:
  1. /opt/aeigsth/supabase/docker/.env içindeki secret'ları değiştir, `docker compose up -d` ile yeniden başlat.
  2. SQL dump'ı self-host Postgres'e import et:  bash scripts/restore-selfhost.sh dump.sql
  3. /opt/aeigsth/app/.env içindeki ANON_KEY'i self-host değeriyle güncelle.
  4. cd /opt/aeigsth/app && npm run build && pm2 start ".output/server/index.mjs" --name aeigsth
  5. pm2 save && pm2 startup
  6. (Opsiyonel) mkp224o ile vanity .onion adresi üret.
NEXT
