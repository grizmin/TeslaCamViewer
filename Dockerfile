# syntax=docker/dockerfile:1.6
# TeslaCamViewer — static site served via nginx.
FROM nginx:1.27-alpine

# Two small additions to the default server config:
#   - gzip on text assets (locale JSON, the large embedded-EN fallback in i18n.js)
#   - long immutable cache on .onnx models (~10 MB, filename-pinned)
# Everything else (MIME types, default routing, directory index) uses nginx
# defaults. Do NOT add a `types {}` block at server scope — it replaces the
# http-level mime.types and makes index.html download as octet-stream.
RUN <<'CONF' cat > /etc/nginx/conf.d/default.conf
server {
    listen 80;
    listen [::]:80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_comp_level 6;
    gzip_min_length 1024;
    gzip_vary on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;

    location ~* \.onnx$ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
CONF

COPY index.html favicon.svg version.json CNAME /usr/share/nginx/html/
COPY js         /usr/share/nginx/html/js/
COPY locales    /usr/share/nginx/html/locales/
COPY styles     /usr/share/nginx/html/styles/
COPY vendor     /usr/share/nginx/html/vendor/

EXPOSE 80
