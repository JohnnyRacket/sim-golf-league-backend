# ── Development stage ─────────────────────────────────────────
# Used by docker-compose.yml — bind-mounts source, runs tsx watch
FROM node:22-alpine AS development
WORKDIR /app

RUN apk --no-cache add curl

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ── Testing stage ─────────────────────────────────────────────
# Used by docker-compose.e2e.yml for running e2e tests
FROM development AS testing
ENV NODE_ENV=test
EXPOSE 3001
CMD ["npm", "run", "test-in-container:e2e"]

# ── Build stage ───────────────────────────────────────────────
# Compiles TypeScript → JavaScript via esbuild
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run typecheck && npm run build

# ── Production stage ──────────────────────────────────────────
# Minimal image: only compiled JS + production node_modules
FROM node:22-alpine AS production
WORKDIR /app

RUN apk --no-cache add curl

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy compiled output from build stage
COPY --from=build /app/dist ./dist

# Copy migration files and start script (needed at runtime)
COPY src/db/migrations ./src/db/migrations
COPY scripts/docker-start.sh ./scripts/docker-start.sh
COPY kysely.config.ts ./

ENV NODE_ENV=production
EXPOSE 3000

USER appuser
CMD ["node", "dist/index.js"]
