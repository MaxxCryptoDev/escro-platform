#!/usr/bin/env bash
# One-time helper: issues the first Let's Encrypt cert and swaps edge nginx
# from HTTP-only bootstrap config to the full HTTPS config.
#
# Usage:
#   ./scripts/issue-cert.sh escro.ro vladau.claudiu95@gmail.com
#
# Prerequisites:
#   - DNS A-records for $DOMAIN and www.$DOMAIN point to this VPS
#   - Port 80 is open on the firewall
#   - docker compose is up (at least edge + frontend) with HTTP-only edge config
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <domain> <email>"
  echo "Example: $0 escro.ro vladau.claudiu95@gmail.com"
  exit 1
fi

DOMAIN="$1"
EMAIL="$2"
COMPOSE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$COMPOSE_DIR"

echo "==> Step 1/4: Activating HTTP-only edge config (bootstrap)"
cp edge/nginx.http.conf edge/active.conf
docker compose up -d edge frontend
docker compose exec edge nginx -t
docker compose exec edge nginx -s reload || docker compose restart edge

echo "==> Step 2/4: Verifying ACME path is reachable"
sleep 3
TEST_TOKEN="test-$(date +%s)"
mkdir -p certbot/www/.well-known/acme-challenge
echo "$TEST_TOKEN" > "certbot/www/.well-known/acme-challenge/$TEST_TOKEN"
if ! curl -fsS "http://$DOMAIN/.well-known/acme-challenge/$TEST_TOKEN" | grep -q "$TEST_TOKEN"; then
  echo "ERROR: ACME path not reachable at http://$DOMAIN — check DNS + firewall"
  rm -f "certbot/www/.well-known/acme-challenge/$TEST_TOKEN"
  exit 1
fi
rm -f "certbot/www/.well-known/acme-challenge/$TEST_TOKEN"
echo "    OK — http://$DOMAIN/.well-known/acme-challenge/ is reachable"

echo "==> Step 3/4: Requesting cert from Let's Encrypt"
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d "$DOMAIN" -d "www.$DOMAIN" \
  --email "$EMAIL" --agree-tos --no-eff-email --non-interactive

echo "==> Step 4/4: Swapping to HTTPS config"
sed "s/\${DOMAIN}/$DOMAIN/g" edge/nginx.https.conf > edge/active.conf
docker compose exec edge nginx -t
docker compose exec edge nginx -s reload

echo ""
echo "==> Done. Your site should now be live at https://$DOMAIN"
echo "    Test: curl -I https://$DOMAIN"
echo "    Auto-renewal runs every 12h via the certbot container."
