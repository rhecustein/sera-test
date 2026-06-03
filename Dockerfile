# Stage 1: Build
FROM node:20-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production=false

COPY . .
RUN npm run build

# Stage 2: Production
FROM debian:bookworm-slim AS production

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --create-home --home-dir /home/sera --shell /usr/sbin/nologin sera \
    && mkdir -p /app \
    && chown -R sera:sera /app

COPY --from=builder --chown=sera:sera /app/dist ./dist
COPY --from=builder --chown=sera:sera /app/node_modules ./node_modules
COPY --from=builder --chown=sera:sera /app/package.json ./

USER sera

EXPOSE 60010

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -fs http://localhost:60010/health || exit 1

CMD ["node", "dist/main"]
