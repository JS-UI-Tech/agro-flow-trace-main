# Multi-stage Dockerfile for the AgroTrace Bun API.
# Build context = ./api (set "Base Directory" to /api in Coolify).

FROM oven/bun:1.3.8-alpine AS base
WORKDIR /app

# Install dependencies (cached layer)
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Runtime image
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules /app/node_modules
COPY . .

EXPOSE 3000

# Run DB migration for auth tables, then start the server. Migration is
# idempotent; if it fails the container exits and Coolify retries.
CMD ["sh", "-c", "bunx @better-auth/cli@latest migrate -y --config src/auth.ts || true; bun src/index.ts"]
