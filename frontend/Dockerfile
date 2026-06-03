FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx \
    && rm -rf /var/lib/apt/lists/* \
    && rm -f /etc/nginx/sites-enabled/default /etc/nginx/conf.d/default.conf

COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/sera.conf

EXPOSE 60011

CMD ["nginx", "-g", "daemon off;"]
