#!/usr/bin/env bash
# SQL dump'ı self-hosted Supabase Postgres'e import et
# Kullanım:  bash restore-selfhost.sh dump.sql        (veya .sql.gpg)
set -euo pipefail

INPUT="${1:?Kullanım: $0 <dump.sql veya dump.sql.gpg>}"
SELFHOST_DB_URL="${SELFHOST_DB_URL:-postgres://postgres:postgres@127.0.0.1:5432/postgres}"

WORK="${INPUT}"
if [[ "${INPUT}" == *.gpg ]]; then
  WORK="${INPUT%.gpg}"
  echo "[+] GPG çözülüyor..."
  gpg -d "${INPUT}" > "${WORK}"
fi

echo "[+] Restore ediliyor → ${SELFHOST_DB_URL}"
psql "${SELFHOST_DB_URL}" -v ON_ERROR_STOP=0 -f "${WORK}"

if [[ "${INPUT}" == *.gpg ]]; then
  shred -uvz "${WORK}"
fi

echo "[+] Bitti. Auth kullanıcılarını ayrıca taşıman gerekebilir (auth.users tablosu)."
