# Mock Stride on the demo EC2 (built by the backend's docker-compose.prod.yml, service mock-stride).
# Env comes from mock-stride.env on the server at start; nothing secret is baked in.
FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/package.json ./
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/.next ./.next
USER app
EXPOSE 3100
CMD ["node_modules/.bin/next", "start", "-p", "3100", "-H", "0.0.0.0"]
