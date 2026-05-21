# syntax=docker/dockerfile:1.7
# ---------- Stage 1: dependencies ----------
FROM node:20-alpine AS deps
WORKDIR /app

# Install build toolchain only for native modules (bcrypt-style); removed in final image
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
 && apk add --no-cache tini

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund \
 && apk del .build-deps

# ---------- Stage 2: runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=5000

RUN apk add --no-cache tini curl \
 && addgroup -S app && adduser -S app -G app

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=app:app . .

# Persistent runtime dirs (also mounted as volume in compose)
RUN mkdir -p uploads/deliverables uploads/chat uploads/evidence \
             uploads/user-contracts uploads/contracts uploads/invoices \
             uploads/portfolio uploads/profiles \
 && chown -R app:app uploads

USER app
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:5000/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
