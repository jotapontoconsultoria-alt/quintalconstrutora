#!/usr/bin/env bash
# Backup diário: banco + fotos, mantendo os 14 mais recentes. Agende no cron (veja DEPLOY-HOSTINGER.md).
set -euo pipefail
cd "$(dirname "$0")/.."
DEST="${BACKUP_DIR:-$HOME/backups-quintal}"
mkdir -p "$DEST"
docker compose exec -T app node scripts/backup.mjs
tar -czf "$DEST/quintal-$(date +%F).tar.gz" --exclude='dados/quintal.db*' -C . dados
ls -1t "$DEST"/quintal-*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm --
echo "Backup salvo em $DEST"
