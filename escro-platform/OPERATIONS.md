# ESCRO — Operations Guide

Production operational concerns: monitoring, logging, backup, rate-limits, security headers.

## Environment Variables

Required:
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET` (min 32 random chars)
- `FRONTEND_URL` (https://escro.ro in production)

Optional production tooling:
- `SENTRY_DSN` — enable Sentry error tracking (auto-detected; no-op if unset)
- `SENTRY_TRACES_SAMPLE_RATE` — default 0.1 (10% of requests get APM tracing)
- `LOG_LEVEL` — pino level (`trace|debug|info|warn|error|fatal`). Default: `info` in prod, `debug` otherwise
- `NODE_ENV=production` — switches pino to plain JSON output (parseable by Datadog/ELK)
- `BACKUP_DIR` — override default `./backups` for backup script
- `BACKUP_RETENTION_DAYS` — default 30

## Logging

Structured logging via `pino` + request_id correlation. Every HTTP request gets a unique `x-request-id` header (echoed in response). Logs include:
- Request method, URL, user_id (if authenticated)
- Response status code + duration
- Errors with stack + request context

Sensitive fields auto-redacted: `authorization`, `cookie`, `password`, `password_hash`, `newPassword`, `currentPassword`, `token`.

In production: pipe stdout to a log aggregator (Datadog, ELK, Grafana Loki). Each line is valid JSON.

To filter by request_id during investigation:
```bash
journalctl -u escro-backend | grep '"req_id":"<uuid>"'
```

## Error Tracking (Sentry)

Set `SENTRY_DSN` in `.env` and Sentry starts capturing:
- All `5xx` responses through error handler
- Uncaught exceptions in async code
- Performance traces (10% sample rate by default)

If `SENTRY_DSN` is unset, Sentry is a no-op. Same code in dev/prod.

Frontend Sentry can be added with `@sentry/react` (not yet integrated — track in separate package.json if needed).

## Rate Limits

| Endpoint | Limit | Window | Key |
|---|---|---|---|
| `/api/auth/*` | 20 | 15 min | IP |
| `/api/auth/forgot-password` | 5 | 1 hour | IP + email |
| `/api/*` (default) | 200 | 1 min | IP |
| `/api/escrow/*` (write) | 15 | 1 min | userId |
| `/api/wallet/payout` | 10 | 1 hour | userId |

Localhost is exempt from auth limit (so dev/staging don't hit it during testing).

Behind reverse proxy: `app.set('trust proxy', 1)` ensures `req.ip` reads `X-Forwarded-For`.

## Content Security Policy

Configured in `server.js` via helmet:
- `script-src 'self' 'unsafe-inline' https://js.stripe.com`
- `connect-src 'self' ws: wss: https://api.stripe.com`
- `img-src 'self' data: blob: https:`
- `frame-src https://js.stripe.com https://hooks.stripe.com`

If you add new external scripts (analytics, fonts), update directives. `'unsafe-inline'` is required for Vite injected runtime styles — consider migrating to nonces post-MVP.

## Database Backup

Daily backup script at `backend/scripts/backupDb.sh`. Reads `.env`, runs `pg_dump`, gzips, and prunes backups older than 30 days.

### Cron setup (server)

```cron
# Daily DB backup at 03:00 UTC
0 3 * * * /opt/escro/backend/scripts/backupDb.sh >> /var/log/escro-backup.log 2>&1
```

### Off-site copy (recommended)

After local backup, sync to S3/R2:
```bash
0 4 * * * aws s3 sync /srv/backups s3://escro-backups/ --delete
```

### Restore

```bash
gunzip -c /srv/backups/escro_2026-05-14_03-00.sql.gz | \
  psql -h localhost -U postgres -d escro_platform_restore
```

Always restore to a **separate database first** to verify integrity before swapping.

## Real-time Notifications

Uses Postgres `LISTEN/NOTIFY` (trigger on `notifications` table). When any controller inserts a notification row, the DB notifies the Node process via the LISTEN socket, which then emits to the user's Socket.io room. No code changes needed when adding new notification types — the trigger handles it.

If you scale horizontally (multiple Node instances), each instance LISTENs and emits to clients connected to that instance — pgNotify broadcasts to all subscribers. For Socket.io across instances, add the `@socket.io/redis-adapter` (not yet configured).

## HTTPS / Reverse Proxy

Recommended: Caddy (auto HTTPS) or Nginx + Certbot.

### Caddy example (`Caddyfile`)
```
escro.ro {
  encode gzip
  reverse_proxy localhost:5000
}
```

### Nginx example
```nginx
server {
  listen 443 ssl http2;
  server_name escro.ro;
  ssl_certificate     /etc/letsencrypt/live/escro.ro/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/escro.ro/privkey.pem;

  client_max_body_size 60M;

  location / {
    proxy_pass http://localhost:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

Force HTTPS redirect with separate `:80` server block (Nginx) or Caddy auto.

## CDN for Public Uploads

Profile photos (`/uploads/profiles`) and portfolio (`/uploads/portfolio`) are publicly readable. Production should serve them via CDN to:
1. Reduce Node load
2. Cache at edge for faster global delivery

Options:
- Cloudflare R2 + Cloudflare CDN (free tier sufficient for MVP)
- AWS S3 + CloudFront
- BunnyCDN (cheapest)

Migration: change `upload.diskStorage` destinations to write to S3 via `@aws-sdk/client-s3`, and serve files via CDN URL instead of `/uploads/...`. Auth-protected uploads (deliverables, contracts, etc.) should stay on Node with the JWT check.

## Monitoring Checklist

| Concern | Tool | Status |
|---|---|---|
| Error tracking | Sentry (`SENTRY_DSN`) | Optional, recommended |
| Logs aggregation | Datadog/ELK/Loki | Manual setup |
| Uptime monitoring | UptimeRobot / BetterStack | External |
| Health check | `GET /api/health` | Built-in |
| DB monitoring | pg_stat_statements | Manual setup |
| Process supervision | systemd / PM2 | Deployment-level |
| SSL cert expiry | Caddy auto / Certbot cron | Deployment-level |

## Health Check

`GET /api/health` → `{ status: "ok", db: true, uptime_seconds: 1234, timestamp: "..." }`.

503 if DB unreachable. Use this for load balancer health checks and uptime monitoring.

## Suspended User Sessions

When admin deletes/rejects a user, their JWT remains technically valid until expiry (7d). The `protect` middleware now re-checks DB `users.deleted_at` / `kyc_status` with a 60s in-memory cache. Cache is invalidated server-side on `deleteUser` and `rejectUser` so suspended users lose access immediately.

If you scale horizontally, replace the in-memory cache with Redis or accept the 60s eventual consistency window.
