FROM node:alpine AS builder
LABEL org.opencontainers.image.authors="Trinera"
EXPOSE 80

WORKDIR /app

# přidej git do builderu kvůli collect-build-info.js
RUN apk add --no-cache git

COPY . /app

# zkopíruj .git kvůli collect-build-info.js
COPY .git /app/.git

RUN npm install -g @angular/cli && \
  npm install && \
  npm run build

FROM nginx:alpine
LABEL org.opencontainers.image.authors="Trinera"
COPY --from=builder \
   /app/dist/katalogizace-frontend/browser/ /usr/share/nginx/html
COPY docker/etc/nginx/conf.d/default.conf /etc/nginx/conf.d/

# ⬇️ nový entrypoint skript
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh


# FIXME probably these 2 lines are not needed while building
# on github CI/CD
RUN find /usr/share/nginx/html -type d -exec chmod 0755 {} \; && \
    find /usr/share/nginx/html -type f -exec chmod 0644 {} \;

ENTRYPOINT ["/entrypoint.sh"]
