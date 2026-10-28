# Mock Stride on the demo EC2 (built by the backend's docker-compose.prod.yml, service mock-stride).
# Env comes from mock-stride.env on the server at start; nothing secret is baked in.
FROM node:22-alpine AS build
# URL path prefix, e.g. /mock-stride on demo.aibolt.ai (compose passes it). Next fixes it at build time.
ARG BASE_PATH=""
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 BASE_PATH=$BASE_PATH
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
ARG BASE_PATH=""
WORKDIR /app
# next start reads next.config.mjs again, so it must see the same base path as the build.
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 BASE_PATH=$BASE_PATH
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/package.json /app/next.config.mjs ./
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/.next ./.next
USER app
EXPOSE 3100
CMD ["node_modules/.bin/next", "start", "-p", "3100", "-H", "0.0.0.0"]
