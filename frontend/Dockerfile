FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx \
    && rm -rf /var/lib/apt/lists/*

# Artefak di-build di luar Docker (npm run build), lalu di-copy ke sini
COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 60011

CMD ["nginx", "-g", "daemon off;"]
