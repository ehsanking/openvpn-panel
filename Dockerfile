# syntax=docker/dockerfile:1.6
#
# Power VPN Panel — multi-stage Dockerfile
#
# Build stage compiles the better-sqlite3 native addon (needs python+toolchain)
# and runs `next build`. Runtime stage ships only the prebuilt output and the
# pruned production node_modules, runs as a non-root user, and persists the
# SQLite database under /data via the `panel-data` volume.

############################
# 1. Builder
############################
FROM node:20-alpine AS builder

# Native build deps for better-sqlite3
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite-dev

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run build

# Trim dev deps — keeps runtime image small.
RUN npm prune --omit=dev

############################
# 2. Runtime
############################
FROM node:20-alpine AS runner

# Runtime needs the sqlite shared library (the prebuilt addon dlopens it).
RUN apk add --no-cache sqlite-libs tini && \
    addgroup -S app && adduser -S app -G app

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Copy the built artefacts and pruned production deps.
COPY --from=builder --chown=app:app /app/.next ./.next
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/package.json ./package.json
COPY --from=builder --chown=app:app /app/next.config.ts ./next.config.ts
COPY --from=builder --chown=app:app /app/schema.sql ./schema.sql

# /data holds panel.sqlite + .jwt_secret (mounted as a volume in compose).
RUN mkdir -p /data && chown app:app /data

USER app

# The lib/db.ts and lib/auth-utils.ts modules look at process.cwd() for
# panel.sqlite and .jwt_secret. Symlinking them out of /app to /data keeps
# the image immutable while persisting state across container restarts.
RUN ln -sf /data/panel.sqlite ./panel.sqlite && \
    ln -sf /data/.jwt_secret ./.jwt_secret

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npm", "start"]
