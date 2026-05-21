#!/usr/bin/env bash
# Wrapper around `docker compose up -d` that ensures edge/active.conf exists
# before nginx starts. Run this instead of `docker compose up -d`.
#
# Usage:
#   ./scripts/up.sh             # bring up all services
#   ./scripts/up.sh backend     # bring up specific service(s)
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f edge/active.conf ]; then
  echo "==> First run: seeding edge/active.conf with HTTP-only bootstrap config"
  cp edge/nginx.http.conf edge/active.conf
  echo "    (Run scripts/issue-cert.sh to swap to HTTPS once DNS points here)"
fi

if [ ! -f backend/.env ]; then
  echo "ERROR: backend/.env is missing. Copy backend/.env.production.example and fill values."
  exit 1
fi

if [ ! -f .env ]; then
  echo "ERROR: .env (root) is missing. Copy .env.example and fill DB_PASSWORD."
  exit 1
fi

docker compose up -d "$@"
docker compose ps
