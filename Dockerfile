# --- Stage 1: Dependencies ---
FROM node:22-slim AS deps

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

# --- Stage 2: Build ---
FROM node:22-slim AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

# better-sqlite3 needs build tools for native compilation
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN pnpm prisma:generate

# Build Next.js (standalone output)
RUN pnpm build

# --- Stage 3: Production ---
FROM node:22-slim AS runner

# better-sqlite3 native module needs libstdc++ at runtime
RUN apt-get update && apt-get install -y libstdc++6 && rm -rf /var/lib/apt/lists/*

# Install Prisma CLI in an isolated directory (before copying standalone output)
# This avoids conflicts with the standalone node_modules from Next.js
RUN mkdir -p /prisma-cli && cd /prisma-cli && npm init -y && npm install prisma@7.3.0

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy standalone build output (per Next.js Docker example)
COPY --from=builder --chown=node:node /app/public ./public
RUN mkdir .next
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Copy Prisma schema, migrations and config for runtime migration
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Copy the generated Prisma client (needed by the standalone server)
COPY --from=builder /app/app/generated ./app/generated

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run migrations (using isolated Prisma CLI) then start the server
CMD ["sh", "-c", "/prisma-cli/node_modules/.bin/prisma migrate deploy --config ./prisma.config.ts && node server.js"]
