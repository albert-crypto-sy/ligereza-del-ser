#!/usr/bin/env bash
# Despliega (o actualiza) el sitio en el VPS. Ejecutar como root en el servidor.
set -euo pipefail

DOMAIN=pruebas.somfylabs.cloud
REPO=https://github.com/albert-crypto-sy/ligereza-del-ser.git
SRC=/opt/ligereza-del-ser
WEB=/var/www/$DOMAIN

if [ -d "$SRC/.git" ]; then
  git -C "$SRC" pull --ff-only
else
  git clone "$REPO" "$SRC"
fi

mkdir -p "$WEB"
cp "$SRC"/index.html "$SRC"/styles.css "$SRC"/main.js "$WEB"/

if [ ! -f /etc/nginx/sites-available/$DOMAIN ]; then
  cp "$SRC/deploy/$DOMAIN.conf" /etc/nginx/sites-available/$DOMAIN
  ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN
  nginx -t && systemctl reload nginx
  # HTTPS con Let's Encrypt (requiere que el DNS ya apunte al VPS)
  certbot --nginx -d $DOMAIN --non-interactive --agree-tos --redirect -m admin@somfylabs.cloud || \
    echo "certbot falló: revisa el DNS y vuelve a ejecutar certbot --nginx -d $DOMAIN"
else
  nginx -t && systemctl reload nginx
fi

echo "Listo: https://$DOMAIN"
