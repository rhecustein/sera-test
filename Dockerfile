FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:20-slim

WORKDIR /app

RUN useradd --system --create-home --home-dir /home/sera --shell /usr/sbin/nologin sera \
    && chown -R sera:sera /app

COPY --from=builder --chown=sera:sera /app/dist ./dist
COPY --from=builder --chown=sera:sera /app/node_modules ./node_modules
COPY --from=builder --chown=sera:sera /app/package.json ./

USER sera

EXPOSE 60010

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:60010/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/main"]
