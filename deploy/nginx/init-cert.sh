#!/bin/sh
# Placeholder cert so nginx can start before Let's Encrypt runs.
set -eu

CERT=/etc/nginx/ssl/fullchain.pem
KEY=/etc/nginx/ssl/privkey.pem

if [ -s "$CERT" ] && [ -s "$KEY" ]; then
  exit 0
fi

apk add --no-cache openssl >/dev/null
mkdir -p /etc/nginx/ssl
openssl req -x509 -nodes -newkey rsa:2048 -days 2 \
  -keyout "$KEY" \
  -out "$CERT" \
  -subj "/CN=letsallpaint.com"
chmod 644 "$CERT" "$KEY"
