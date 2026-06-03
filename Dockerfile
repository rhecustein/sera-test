FROM debian:bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --create-home --home-dir /home/sera --shell /usr/sbin/nologin sera \
    && chown -R sera:sera /app

# Artefak di-build di luar Docker (npm run build), lalu di-copy ke sini
COPY --chown=sera:sera dist ./dist
COPY --chown=sera:sera package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

USER sera

EXPOSE 60010

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -fs http://localhost:60010/health || exit 1

CMD ["node", "dist/main"]
