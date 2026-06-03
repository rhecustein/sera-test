FROM node:20-slim

WORKDIR /app

RUN useradd --system --create-home --home-dir /home/sera --shell /usr/sbin/nologin sera \
    && chown -R sera:sera /app

COPY --chown=sera:sera package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=sera:sera dist ./dist

USER sera

EXPOSE 60010

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:60010/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/main"]
